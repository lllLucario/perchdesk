# Frontend Design Overview

## Purpose

This directory defines the visual and interaction direction for PerchDesk frontend work. It exists so product, design, and implementation decisions use a shared reference instead of re-arguing styling at each screen.

The design direction is:
- editorial and calm rather than futuristic
- green-led rather than terracotta-led
- spatial and trustworthy rather than dashboard-heavy
- quiet in UI chrome, clear in booking-critical states

## Core Reference

The canonical design reference is [DESIGN.md](/Users/kkkadoya/Desktop/perchdesk/docs/design/DESIGN.md).

Use that file for:
- visual theme and atmosphere
- color palette and tokens
- typography hierarchy
- component styling defaults
- layout and depth principles

Use the companion docs in this folder to translate that direction into product surfaces and reusable rules.

## Document Map

- [foundations.md](/Users/kkkadoya/Desktop/perchdesk/docs/design/foundations.md): tokens, color rules, typography, spacing, radius, elevation, light/dark theme guidance
- [components.md](/Users/kkkadoya/Desktop/perchdesk/docs/design/components.md): reusable UI component behavior and styling expectations
- [surfaces.md](/Users/kkkadoya/Desktop/perchdesk/docs/design/surfaces.md): page-level guidance for major app surfaces
- [patterns.md](/Users/kkkadoya/Desktop/perchdesk/docs/design/patterns.md): cross-cutting interaction patterns, states, responsive behavior, and content style

## Scope Boundary

`docs/design/*` defines visual and interaction rules.

`docs/features/*` defines feature scope, contracts, and implementation impact.

Feature docs should reference this folder when they need design direction rather than redefining colors, spacing, or generic interaction patterns.
