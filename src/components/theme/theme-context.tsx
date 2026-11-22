"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ColorPalette = "emerald" | "blue" | "violet" | "rose" | "orange" | "slate";
export type Density = "compact" | "comfortable" | "spacious";
export type LayoutMode = "sidebar" | "mini" | "compact" | "floating" | "top-nav" | "hybrid";
export type Direction = "rtl" | "ltr";
export type ActingRole = "ADMIN" | "MANAGER" | "SALES";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  color: ColorPalette;
  setColor: (color: ColorPalette) => void;
  density: Density;
  setDensity: (density: Density) => void;
  layout: LayoutMode;
  setLayout: (layout: LayoutMode) => void;
  direction: Direction;
  setDirection: (direction: Direction) => void;
  actingRole: ActingRole;
  setActingRole: (role: ActingRole) => void;
  isCustomizerOpen: boolean;
  setIsCustomizerOpen: (open: boolean) => void;
  resetDefaults: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [color, setColor] = useState<ColorPalette>("emerald");
  const [density, setDensity] = useState<Density>("comfortable");
  const [layout, setLayout] = useState<LayoutMode>("sidebar");
  const [direction, setDirection] = useState<Direction>("rtl");
  const [actingRole, setActingRole] = useState<ActingRole>("ADMIN");
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    // Load from localStorage if present
    const savedTheme = localStorage.getItem("sanjagh_theme") as ThemeMode;
    const savedColor = localStorage.getItem("sanjagh_color") as ColorPalette;
    const savedDensity = localStorage.getItem("sanjagh_density") as Density;
    const savedLayout = localStorage.getItem("sanjagh_layout") as LayoutMode;
    const savedDirection = localStorage.getItem("sanjagh_direction") as Direction;
    const savedRole = localStorage.getItem("sanjagh_acting_role") as ActingRole;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate state from localStorage on client mount to avoid theme flash and SSR mismatch
    if (savedTheme) setTheme(savedTheme);
    if (savedColor) setColor(savedColor);
    if (savedDensity) setDensity(savedDensity);
    if (savedLayout) setLayout(savedLayout);
    if (savedDirection) setDirection(savedDirection);
    if (savedRole) setActingRole(savedRole);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("sanjagh_theme", theme);
    localStorage.setItem("sanjagh_color", color);
    localStorage.setItem("sanjagh_density", density);
    localStorage.setItem("sanjagh_layout", layout);
    localStorage.setItem("sanjagh_direction", direction);
    localStorage.setItem("sanjagh_acting_role", actingRole);

    // Apply classes and attributes to document element
    const root = document.documentElement;

    // Dark mode
    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Color attribute
    root.setAttribute("data-color", color);
    root.setAttribute("data-density", density);
    root.setAttribute("data-layout", layout);
    root.setAttribute("dir", direction);
  }, [theme, color, density, layout, direction, actingRole, mounted]);

  const resetDefaults = () => {
    setTheme("light");
    setColor("emerald");
    setDensity("comfortable");
    setLayout("sidebar");
    setDirection("rtl");
    setActingRole("ADMIN");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        color,
        setColor,
        density,
        setDensity,
        layout,
        setLayout,
        direction,
        setDirection,
        actingRole,
        setActingRole,
        isCustomizerOpen,
        setIsCustomizerOpen,
        resetDefaults,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeCustomizer() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeCustomizer must be used within a ThemeProvider");
  }
  return context;
}
