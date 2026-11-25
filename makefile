FRONTEND_DIR := services/frontend/website
TF_DIR       := infrastructure/terraform

# What `verify-styles` runs against each style, before building it.
STYLE_TESTS  := src/App.test.tsx src/entry-server.test.tsx src/hydration.test.tsx

.PHONY: install dev run build lint typecheck test coverage test-pipeline verify verify-styles \
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

## Install dependencies (run this first)
install:
	cd $(FRONTEND_DIR) && npm install

## Start the dev server on http://localhost:5173
dev:
	cd $(FRONTEND_DIR) && npm run dev

## Alias for dev
run: dev

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

## Everything CI runs, in CI order: its verify job (lint, tests with the
## coverage thresholds, types, build), its pipeline job and its terraform job.
## `verify-styles` is the one CI step left out; run it when a style changes.
##
## Everything CI runs, in CI order. Run this before every commit.
verify: lint coverage typecheck build test-pipeline tf-fmt tf-validate
	@printf '\n\033[1;32m✓ verify passed\033[0m  lint, tests + coverage, types, build, pipeline, terraform\n\n'

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
