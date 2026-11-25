FRONTEND_DIR := services/frontend/website
ADMIN_DIR    := services/frontend/admin
API_DIR      := services/api
SHARED_DIR   := services/shared
TF_DIR       := infrastructure/terraform
# One package's checks, skipped with a loud warning while the package does not
# exist yet. The same script CI and the deploy run (REQUIRE_PACKAGES=1 there).
PKG          := bash .github/scripts/package-checks.sh
ENV          ?= dev
PROJECT      := dodarprieku

# What `verify-styles` runs against each style, before building it.
STYLE_TESTS  := src/App.test.tsx src/entry-server.test.tsx src/hydration.test.tsx

.PHONY: install dev run build lint typecheck test coverage test-pipeline verify verify-styles \
        verify-shared verify-api verify-admin dev-api dev-admin admin-invite \
        preview a11y sitemap images tf-fmt tf-validate clean help

## Show this help
help:
	@awk '\
	  /^## /            { desc = substr($$0, 4); next } \
	  /^[a-zA-Z0-9_-]+:/{ if (desc != "") { \
	                        target = $$0; sub(/:.*/, "", target); \
	                        printf "  \033[36m%-14s\033[0m %s\n", target, desc; \
	                        desc = "" } \
	                      next } \
	  { desc = "" } \
	' $(MAKEFILE_LIST)

## Install every package's dependencies (run this first)
install:
	cd $(FRONTEND_DIR) && npm install
	@$(PKG) $(SHARED_DIR) install
	@$(PKG) $(API_DIR) install
	@$(PKG) $(ADMIN_DIR) install

## Start the dev server on http://localhost:5173
dev:
	cd $(FRONTEND_DIR) && npm run dev

## Alias for dev
run: dev

## The API locally (services/api, its own dev server)
dev-api:
	@test -f $(API_DIR)/package.json || { echo "$(API_DIR) does not exist yet"; exit 1; }
	cd $(API_DIR) && npm run dev

## The admin portal locally (services/frontend/admin)
dev-admin:
	@test -f $(ADMIN_DIR)/package.json || { echo "$(ADMIN_DIR) does not exist yet"; exit 1; }
	cd $(ADMIN_DIR) && npm run dev

## Invokes the API Lambda directly ({"task":"invite-admin"}), which only an IAM
## principal can do, so it needs AWS credentials for the account. The function
## name comes from the Terraform output when the state is reachable and is for
## ENV, else from the naming convention <env>-dodarprieku-api.
##
## Invite an admin: make admin-invite EMAIL=you@example.lv ENV=dev
admin-invite:
	@test -n "$(EMAIL)" || { echo 'Usage: make admin-invite EMAIL=you@example.lv ENV=dev'; exit 1; }
	@case "$(ENV)" in dev|prod) ;; *) echo "ENV must be dev or prod, not $(ENV)"; exit 1 ;; esac
	@test -f $(API_DIR)/scripts/admin-invite.sh || { echo "$(API_DIR)/scripts/admin-invite.sh is missing: the API package provides it."; exit 1; }
	@FN="$$(terraform -chdir=$(TF_DIR) output -raw api_function_name 2>/dev/null | grep -E '^[a-z0-9-]+$$' || true)"; \
	  case "$$FN" in $(ENV)-*) ;; *) FN="$(ENV)-$(PROJECT)-api" ;; esac; \
	  echo "Inviting $(EMAIL) through $$FN"; \
	  AWS_REGION="$${AWS_REGION:-eu-north-1}" bash $(API_DIR)/scripts/admin-invite.sh "$$FN" "$(EMAIL)"

## Production build
build:
	cd $(FRONTEND_DIR) && npm run build

## Run the linter
lint:
	cd $(FRONTEND_DIR) && npm run lint

## Type-check without emitting
typecheck:
	cd $(FRONTEND_DIR) && npx tsc -b

## Unit and component tests
test:
	cd $(FRONTEND_DIR) && npm run test

## Tests with a coverage report (thresholds enforced)
coverage:
	cd $(FRONTEND_DIR) && npm run test:coverage

## The deploy pipeline's own shell, which the website's tests do not reach:
## the canonical-origin check before a deploy build, the deploy's preflight,
## and the policy setup.sh writes for the deploy roles. Needs bash, jq and
## node; every test stubs the AWS CLI. CI's `pipeline` job.
##
## Deploy pipeline tests (.github/tests)
test-pipeline:
	bash .github/tests/run.sh

## The shared contracts: types and tests
verify-shared:
	@$(PKG) $(SHARED_DIR) typecheck test

## The API: lint, types, tests with coverage, the bundle
verify-api:
	@$(PKG) $(API_DIR) lint typecheck test:coverage build

## The admin portal: lint, types, tests with coverage, the build
verify-admin:
	@$(PKG) $(ADMIN_DIR) lint typecheck test:coverage build

## Everything CI runs, in CI order: its verify job (lint, tests with the
## coverage thresholds, types, build), its packages job (shared, API, admin;
## a package that does not exist yet is skipped with a warning), its pipeline
## job and its terraform job. `verify-styles` is the one CI step left out;
## run it when a style changes.
##
## Everything CI runs, in CI order. Run this before every commit.
verify: lint coverage typecheck build verify-shared verify-api verify-admin test-pipeline tf-fmt tf-validate
	@printf '\n\033[1;32m✓ verify passed\033[0m  website, shared, api, admin, pipeline, terraform\n\n'

## `verify` compiles and routes ONE style, whichever site.config.json names, so
## two classes of defect hide from it: a style that does not build at all, and
## a route test that is quietly asserting the active style's own markup. Both
## have happened. This is the check that finds them. The build includes the
## prerender, which fails on any page that throws, renders no h1 or declares
## the wrong canonical; the hydration test fails on any page the browser could
## not reuse.
##
## Make each style active in turn: route, prerender, hydrate and build it
verify-styles:
	@cd $(FRONTEND_DIR) && \
	for id in $$(ls src/styles | while read d; do [ -f "src/styles/$$d/style.ts" ] && echo $$d; done); do \
	  printf '  %-14s ' "$$id"; \
	  if ! VITE_SITE_STYLE=$$id npx vitest run $(STYLE_TESTS) >/tmp/style-$$id.log 2>&1; then \
	    printf '\033[31mTESTS FAILED\033[0m  see /tmp/style-$$id.log\n'; exit 1; \
	  fi; \
	  if VITE_SITE_STYLE=$$id npm run build >>/tmp/style-$$id.log 2>&1; then \
	    printf '\033[32mok\033[0m  routes + hydration + build, %s pages, css %s\n' \
	      "$$(find dist -name '*.html' | wc -l | tr -d ' ')" "$$(du -h dist/assets/index-*.css | cut -f1 | head -1)"; \
	  else \
	    printf '\033[31mBUILD FAILED\033[0m  see /tmp/style-$$id.log\n'; exit 1; \
	  fi; \
	done
	@printf '\n\033[1;32m✓ every style routes, prerenders, hydrates and builds\033[0m\n\n'

## Serve the production build locally
preview:
	cd $(FRONTEND_DIR) && npm run preview

## axe-core (WCAG 2.2 AA), missing alt text and sideways scrolling, on every
## page of the last build, light and dark, phone and desktop. Needs Chromium
## once: cd services/frontend/website && npx playwright install chromium.
## Not in `verify`: CI's verify job installs no browser.
##
## Accessibility audit of the built site (run make build first)
a11y:
	cd $(FRONTEND_DIR) && npm run a11y

## The build writes robots.txt, sitemap.xml and llms.txt into dist/ whenever
## VITE_SITE_URL is set (src/lib/crawler-files.ts). This is that build, for
## checking the three files locally before a deploy.
##
## Build with the crawler files: make sitemap SITE_URL=https://your-domain.com
sitemap:
	@test -n "$(SITE_URL)" || { echo 'Usage: make sitemap SITE_URL=https://your-domain.com'; exit 1; }
	cd $(FRONTEND_DIR) && VITE_SITE_URL="$(SITE_URL)" npm run build && ls -l dist/robots.txt dist/sitemap.xml dist/llms.txt

## Regenerate the placeholder PNGs in public/
images:
	cd $(FRONTEND_DIR) && npm run images

## Check Terraform formatting
tf-fmt:
	cd $(TF_DIR) && terraform fmt -check -recursive -diff

## Validate the Terraform configuration (no AWS credentials needed)
tf-validate:
	cd $(TF_DIR) && terraform init -backend=false -input=false >/dev/null && terraform validate

## Remove build artefacts and dependencies
clean:
	rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/coverage
	rm -rf $(TF_DIR)/.terraform $(TF_DIR)/.terraform.lock.hcl
