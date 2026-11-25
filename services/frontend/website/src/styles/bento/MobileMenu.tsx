import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { NAV_LINKS, ROUTES } from "@/config/site";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/cn";
import { localePath } from "@/lib/locale-path";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

/** Milliseconds between one tile's entrance and the next. */
const STAGGER_MS = 40;

/**
 * The phone menu: the same links as the desktop bar, stacked as tiles.
 *
 * It is a second navigation landmark carrying the same set, which the contract
 * allows. Both are complete, so whichever one is on screen answers "where can
 * I go from here" without the visitor having to find the other.
 *
 * It stays mounted and animates both ways: the panel grows open (grid rows
 * from 0fr to 1fr, so it needs no fixed height), fades in, and its tiles
 * arrive one after another; closing plays it back. Mounting it only when open
 * made it appear in a single frame, which read as a blink. Closed, it is
 * `inert` and `aria-hidden`, so nothing in it can be focused, clicked or read
 * out. Reduced motion zeroes the transitions in `index.css`, so it then simply
 * appears and disappears.
 */
export const MobileMenu = ({
  id,
  open,
  onNavigate,
}: {
  id: string;
  open: boolean;
  onNavigate: () => void;
}) => {
  const { t } = useTranslation("common");
  const { locale } = useLocale();

  // Each item's delay, counting the language row as the last item.
  const item = (index: number): CSSProperties => ({
    transitionDelay: open ? `${80 + index * STAGGER_MS}ms` : "0ms",
  });
  const itemClass = cn(
    "transition-[opacity,translate] duration-300 ease-(--ease-out-soft)",
    open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
  );

  return (
    <div
      id={id}
      inert={!open}
      aria-hidden={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-(--ease-out-soft) lg:hidden",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <Container className="pb-3">
          <nav
            aria-label={t("a11y.mainNavigation")}
            className="flex flex-col gap-1.5 rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised) p-3"
          >
            {NAV_LINKS.map((link, index) => (
              <NavLink
                key={link.to}
                to={localePath(link.to, locale)}
                end
                onClick={onNavigate}
                style={item(index)}
                className={({ isActive }) =>
                  cn(
                    itemClass,
                    "flex min-h-12 items-center rounded-(--radius-md) px-4",
                    "text-(length:--text-lg) font-semibold",
                    isActive
                      ? "bg-(--surface-accent-soft) text-(--text-accent)"
                      : "text-(--text-primary) hover:bg-(--surface-sunken)",
                  )
                }
              >
                {t(link.labelKey)}
              </NavLink>
            ))}

            <div
              style={item(NAV_LINKS.length)}
              className={cn(
                itemClass,
                "mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-(--border-subtle) pt-3",
              )}
            >
              <LanguageSwitcher />
              <ButtonLink to={localePath(ROUTES.contact, locale)} size="sm">
                {t("cta.contactUs")}
              </ButtonLink>
            </div>
          </nav>
        </Container>
      </div>
    </div>
  );
};
