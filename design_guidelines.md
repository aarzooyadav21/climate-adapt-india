{
  "brand": {
    "name": "Bharat Climate Twin — Mission Control",
    "design_personality": [
      "ISRO/NASA mission-control HUD",
      "data-dense, credible, scientific",
      "space-grade dark surfaces (near-black, not pure black)",
      "high-contrast telemetry typography",
      "India-referential accents (saffron) used sparingly"
    ],
    "north_star": "Bloomberg Terminal density + NASA Worldview spatial context + ISRO MOSDAC telemetry panels. Dark-only, information-rich, with provenance everywhere."
  },

  "global_rules": {
    "theme": "dark-only",
    "density": "high (no minimalism)",
    "provenance_everywhere": "Every metric tile, chart, and map layer must show a provenance badge (NASA POWER / Open-Meteo / IMD-style) + timestamp + model/run id when applicable.",
    "testing": {
      "data_testid_required": "All interactive and key informational elements MUST include data-testid in kebab-case (role-based, stable). Examples: map-layer-toggle, scenario-run-button, export-csv-button, advisor-chat-input, monsoon-onset-progress-card, alert-card-open-dialog."
    }
  },

  "inspiration_refs": {
    "web_refs": [
      {
        "title": "NASA Earthdata Worldview",
        "url": "https://www.earthdata.nasa.gov/data/tools/worldview",
        "why": "Layered geospatial climate visualization patterns; timeline + compare mental model."
      },
      {
        "title": "Dribbble search: NASA dashboard",
        "url": "https://dribbble.com/search/nasa-dashboard",
        "why": "HUD panel composition, glow restraint, dense telemetry layouts."
      }
    ],
    "visual_fusion_recipe": [
      "Layout principle: Bloomberg Terminal (multi-column, tight grid, persistent tickers)",
      "Color vernacular: NASA Worldview (cyan/teal data lines) + mission amber alerts",
      "Panel styling: ISRO/MOSDAC-like bordered modules + subtle scanline/noise",
      "Motion: radar sweeps + data-feed pulses (subtle, never distracting)"
    ]
  },

  "typography": {
    "font_pairing": {
      "ui_sans": {
        "name": "Space Grotesk",
        "fallback": "ui-sans-serif, system-ui",
        "usage": "Headings, navigation, narrative summaries, AI advisor responses"
      },
      "mono_numeric": {
        "name": "IBM Plex Mono",
        "fallback": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
        "usage": "All numbers, timestamps, coordinates, telemetry labels, chart axes"
      }
    },
    "google_fonts_import": {
      "instructions": "Add to /app/frontend/src/index.css (top) or in index.html head: @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap');"
    },
    "type_scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "section_title": "text-sm font-semibold tracking-[0.18em] uppercase",
      "kpi_value": "text-2xl md:text-3xl font-semibold tabular-nums",
      "kpi_label": "text-xs text-muted-foreground tracking-wide",
      "body": "text-sm md:text-base leading-relaxed",
      "micro": "text-xs leading-snug"
    },
    "numeric_formatting": {
      "rules": [
        "Use tabular numbers: add Tailwind class tabular-nums on KPI values",
        "Use mono font for timestamps and units",
        "Always show units (°C, mm, %, m/s, W/m²) in muted text"
      ]
    }
  },

  "color_system": {
    "notes": [
      "Near-black surfaces reduce halation; avoid pure #000.",
      "Cyan/teal are the primary data inks; amber/red reserved for warnings/critical.",
      "Saffron is a brand accent only (small strokes, badges, active state)."
    ],
    "tokens_hsl": {
      "background": "222 35% 6%",
      "foreground": "210 20% 96%",

      "card": "222 30% 9%",
      "card-foreground": "210 20% 96%",

      "popover": "222 30% 9%",
      "popover-foreground": "210 20% 96%",

      "muted": "222 18% 14%",
      "muted-foreground": "215 14% 72%",

      "border": "220 18% 18%",
      "input": "220 18% 18%",
      "ring": "184 92% 55%",

      "primary": "184 92% 55%",
      "primary-foreground": "222 35% 6%",

      "secondary": "222 18% 14%",
      "secondary-foreground": "210 20% 96%",

      "accent": "34 92% 56%",
      "accent-foreground": "222 35% 6%",

      "destructive": "0 84% 58%",
      "destructive-foreground": "210 20% 96%",

      "state_success": "152 62% 52%",
      "state_warning": "34 92% 56%",
      "state_info": "196 92% 56%",
      "state_critical": "0 84% 58%",

      "data_cyan": "184 92% 55%",
      "data_teal": "164 78% 48%",
      "data_blue": "204 92% 60%",
      "data_amber": "34 92% 56%",
      "data_red": "0 84% 58%",

      "india_saffron": "28 92% 56%",
      "india_green": "152 62% 52%",

      "chart_1": "184 92% 55%",
      "chart_2": "164 78% 48%",
      "chart_3": "204 92% 60%",
      "chart_4": "34 92% 56%",
      "chart_5": "0 84% 58%"
    },
    "surface_ramps": {
      "space_0": "222 35% 6%",
      "space_1": "222 30% 9%",
      "space_2": "222 22% 12%",
      "space_3": "222 18% 14%",
      "space_4": "220 18% 18%"
    },
    "allowed_gradients": {
      "restriction": "Gradients must be mild, used only as section backgrounds/overlays, never on text-heavy panels; max 20% viewport.",
      "recipes": [
        {
          "name": "orbital-dawn",
          "css": "radial-gradient(1200px 600px at 20% 10%, hsla(184,92%,55%,0.18), transparent 55%), radial-gradient(900px 500px at 80% 20%, hsla(34,92%,56%,0.10), transparent 60%), radial-gradient(900px 700px at 50% 90%, hsla(204,92%,60%,0.10), transparent 60%)",
          "usage": "Landing hero background only (behind globe)"
        },
        {
          "name": "polar-stream",
          "css": "linear-gradient(135deg, hsla(184,92%,55%,0.10), transparent 55%), radial-gradient(700px 400px at 70% 30%, hsla(164,78%,48%,0.10), transparent 60%)",
          "usage": "Top KPI strip background wash (very subtle)"
        }
      ]
    },
    "texture": {
      "noise_overlay": {
        "css": "background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.12%22/%3E%3C/svg%3E');",
        "usage": "Apply to app shell via pseudo-element (pointer-events-none) to avoid flatness"
      },
      "scanlines": {
        "css": "repeating-linear-gradient(to bottom, rgba(255,255,255,0.03), rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)",
        "usage": "Optional on map container only (opacity <= 0.06)"
      }
    }
  },

  "design_tokens_css": {
    "instructions": "Update /app/frontend/src/index.css :root and .dark tokens to match the HSL tokens above. Force dark mode by applying className='dark' on <html> or <body> in React entry.",
    "additional_css_vars": {
      "--hud-radius-sm": "10px",
      "--hud-radius-md": "14px",
      "--hud-border": "1px solid hsl(var(--border) / 0.9)",
      "--hud-shadow": "0 10px 30px rgba(0,0,0,0.45)",
      "--hud-glow-cyan": "0 0 0 1px hsl(var(--primary) / 0.25), 0 0 24px hsl(var(--primary) / 0.10)",
      "--hud-glow-amber": "0 0 0 1px hsl(var(--accent) / 0.22), 0 0 22px hsl(var(--accent) / 0.10)",
      "--grid-gap": "16px",
      "--panel-padding": "16px",
      "--focus-ring": "0 0 0 2px hsl(var(--ring) / 0.9), 0 0 0 6px hsl(var(--ring) / 0.18)"
    }
  },

  "layout": {
    "grid_system": {
      "app_shell": "12-col desktop grid; 4-col mobile; use CSS grid with gap-[var(--grid-gap)]",
      "mission_control": {
        "desktop": "Top KPI strip (sticky) + main 2-column: Map (8 cols) + Context/Telemetry (4 cols).",
        "mobile": "Stack: KPI strip -> Map -> Context panels in ScrollArea; keep layer toggles in a bottom Sheet."
      },
      "page_templates": [
        {
          "name": "dashboard",
          "structure": "Header (clocks + feed status) / KPI strip / main grid (map + right rail) / bottom charts row"
        },
        {
          "name": "analysis",
          "structure": "Left: filters + scenario controls / Right: charts + narrative + export"
        },
        {
          "name": "chat_hud",
          "structure": "Docked right Sheet on desktop; bottom Drawer on mobile"
        }
      ]
    },
    "spacing": {
      "principle": "Use 2–3x more spacing than feels comfortable; dense content is achieved via grid, not cramped padding.",
      "tailwind": {
        "page_padding": "px-4 sm:px-6 lg:px-8 py-4",
        "panel_padding": "p-4 md:p-5",
        "kpi_gap": "gap-3 md:gap-4",
        "section_gap": "space-y-4 md:space-y-6"
      }
    }
  },

  "components": {
    "component_path": {
      "shadcn_ui": "/app/frontend/src/components/ui",
      "primary_components": [
        "card.jsx",
        "button.jsx",
        "badge.jsx",
        "tabs.jsx",
        "table.jsx",
        "tooltip.jsx",
        "sheet.jsx",
        "drawer.jsx",
        "scroll-area.jsx",
        "separator.jsx",
        "select.jsx",
        "switch.jsx",
        "slider.jsx",
        "calendar.jsx",
        "dialog.jsx",
        "sonner.jsx"
      ]
    },
    "hud_panel_pattern": {
      "name": "HUDPanel",
      "base_classes": "rounded-[var(--hud-radius-md)] border border-border/90 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/55 shadow-[var(--hud-shadow)]",
      "header_classes": "flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3",
      "title_classes": "font-[family:var(--font-sans)] text-sm font-semibold tracking-[0.18em] uppercase text-foreground/90",
      "subtitle_classes": "text-xs text-muted-foreground",
      "body_classes": "px-4 py-4",
      "footer_classes": "px-4 py-3 border-t border-border/60",
      "micro_interactions": [
        "On hover: border shifts to primary/30 + subtle cyan glow shadow (no transform transitions globally)",
        "On focus-within: apply --focus-ring"
      ],
      "data_testid": "hud-panel"
    },

    "kpi_tile": {
      "name": "KPITile",
      "layout": "Icon/mini-sparkline left, value center, provenance+timestamp right",
      "classes": "rounded-[var(--hud-radius-sm)] border border-border/80 bg-card/60 px-3 py-3",
      "value_classes": "font-mono tabular-nums text-2xl md:text-3xl text-foreground",
      "delta_classes": "font-mono text-xs text-muted-foreground",
      "data_testid": "kpi-tile"
    },

    "provenance_badges": {
      "name": "ProvenanceBadge",
      "use": "badge.jsx",
      "variants": {
        "nasa_power": "bg-[hsl(var(--chart-3)/0.14)] text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3)/0.35)]",
        "open_meteo": "bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.35)]",
        "imd_style": "bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))] border border-[hsl(var(--accent)/0.35)]"
      },
      "content": "SOURCE • dataset • run • updated IST",
      "data_testid": "provenance-badge"
    },

    "alert_tiles": {
      "name": "AlertTile",
      "use": "alert.jsx + card.jsx",
      "severity_styles": {
        "info": "border-l-4 border-l-[hsl(var(--state_info))]",
        "watch": "border-l-4 border-l-[hsl(var(--state_warning))]",
        "warning": "border-l-4 border-l-[hsl(var(--state_warning))] shadow-[var(--hud-glow-amber)]",
        "critical": "border-l-4 border-l-[hsl(var(--state_critical))]"
      },
      "micro_interactions": [
        "Pulse the severity dot at 1.6s when new alert arrives",
        "Hover reveals 'View timeline' action row (opacity transition only)"
      ],
      "data_testid": "alert-tile"
    },

    "buttons": {
      "style": "Professional / mission-control (medium radius, tonal fills, crisp borders)",
      "tokens": {
        "--btn-radius": "12px",
        "--btn-shadow": "0 10px 24px rgba(0,0,0,0.35)",
        "--btn-press-scale": "0.98"
      },
      "variants": {
        "primary": {
          "use": "button.jsx",
          "classes": "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.92)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
          "data_testid": "primary-button"
        },
        "secondary": {
          "classes": "bg-secondary text-secondary-foreground border border-border/80 hover:bg-secondary/80",
          "data_testid": "secondary-button"
        },
        "ghost": {
          "classes": "bg-transparent hover:bg-white/5 border border-border/60",
          "data_testid": "ghost-button"
        },
        "danger": {
          "classes": "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive)/0.92)]",
          "data_testid": "danger-button"
        }
      },
      "micro_interactions": [
        "On hover: subtle glow via box-shadow (cyan for primary, amber for warning actions)",
        "On press: scale to var(--btn-press-scale) using active:scale-[0.98] (transition only on transform for button)"
      ]
    },

    "filters_and_controls": {
      "layer_switches": {
        "use": "switch.jsx + tooltip.jsx",
        "pattern": "Each layer toggle row shows: label, unit, provenance badge, last updated",
        "data_testid": "map-layer-toggle"
      },
      "scenario_form": {
        "use": "form.jsx + select.jsx + slider.jsx + calendar.jsx",
        "pattern": "Region selector (state/district), warming scenario tabs (+1.5/+2/+3), horizon slider, run button",
        "data_testid": "scenario-form"
      }
    },

    "tables": {
      "use": "table.jsx",
      "styling": "Sticky header, zebra rows with bg-white/2, numeric columns mono + right aligned",
      "data_testid": "data-table"
    },

    "navigation": {
      "top_bar": {
        "use": "navigation-menu.jsx + menubar.jsx",
        "content": "Role switcher, page tabs, UTC/IST clocks, feed status, export button",
        "data_testid": "top-nav"
      },
      "right_rail": {
        "use": "tabs.jsx + scroll-area.jsx",
        "tabs": ["Context", "Layers", "Provenance", "Exports"],
        "data_testid": "right-rail"
      }
    },

    "chat_hud": {
      "use": "sheet.jsx (desktop) + drawer.jsx (mobile) + scroll-area.jsx",
      "pattern": "Docked panel with citations list; messages show inline metric chips + provenance badges",
      "citation_ui": "Use accordion.jsx for expandable citations per message",
      "data_testid": {
        "open": "advisor-chat-open",
        "input": "advisor-chat-input",
        "send": "advisor-chat-send",
        "message": "advisor-chat-message",
        "citation": "advisor-chat-citation"
      }
    }
  },

  "map_and_geospatial": {
    "leaflet_style": {
      "basemap": {
        "recommended": "CartoDB Dark Matter",
        "tile_url": "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "attribution": "&copy; OpenStreetMap &copy; CARTO",
        "data_testid": "leaflet-map"
      },
      "india_boundary": {
        "stroke": "hsl(var(--foreground) / 0.55)",
        "stroke_width": 1,
        "fill": "transparent",
        "hover": "stroke: hsl(var(--primary) / 0.9); stroke-width: 2"
      },
      "choropleth": {
        "temp": "Use cyan->amber ramp (avoid saturated gradients; use discrete steps 7 bins)",
        "rainfall": "Use teal ramp (7 bins)",
        "anomaly": "Diverging: teal (negative) -> neutral gray -> amber (positive)",
        "drought": "Amber->red ramp with clear legend + severity labels"
      },
      "legend": {
        "pattern": "Floating HUDPanel bottom-left; includes units, bins, provenance badge, timestamp",
        "data_testid": "map-legend"
      },
      "layer_controls": {
        "pattern": "Use Sheet on mobile; right-rail tab on desktop",
        "data_testid": "map-layer-controls"
      }
    }
  },

  "charts": {
    "libraries": {
      "primary": "Recharts",
      "optional": "d3-scale for custom ramps (only if needed)"
    },
    "chart_style": {
      "container": "HUDPanel with tighter padding (p-3 md:p-4)",
      "grid_lines": "stroke: hsl(var(--border) / 0.55)",
      "axis": "tick: text-muted-foreground; font: mono; tickSize small",
      "line_series": {
        "stroke_width": 2,
        "colors": [
          "hsl(var(--chart-1))",
          "hsl(var(--chart-2))",
          "hsl(var(--chart-3))",
          "hsl(var(--chart-4))",
          "hsl(var(--chart-5))"
        ]
      },
      "tooltip": "Use tooltip.jsx styled as small HUDPanel; show provenance + timestamp",
      "empty_states": "Use skeleton.jsx + a muted message with suggested actions (change region, widen horizon)"
    },
    "recommended_visuals": [
      "Monsoon: cumulative rainfall vs LPA (two lines) + shaded band for climatology",
      "Extreme weather: severity timeline (area/step chart) + alert markers",
      "Drought: SPI evolution (line) + categorical severity chips",
      "Scenario: small multiples (baseline vs +1.5/+2/+3)"
    ]
  },

  "motion_and_microinteractions": {
    "library": {
      "recommended": "framer-motion",
      "install": "npm i framer-motion",
      "usage_notes": "Use for panel entrance, alert pulse, radar sweep overlays. Respect prefers-reduced-motion."
    },
    "principles": [
      "Motion communicates system state (feed live, alert new, simulation running)",
      "Keep durations short: 120–220ms for UI, 900–1600ms for ambient loops",
      "Never animate large layout shifts; animate opacity, shadow, and small transforms"
    ],
    "patterns": {
      "data_feed_pulse": "Small dot next to 'LIVE' that pulses opacity (not scale) every 1.4s",
      "radar_sweep": "Pseudo-element on map container: conic-gradient sweep at very low opacity (<=0.08)",
      "satellite_pass_arc": "SVG arc that animates stroke-dashoffset when new pass window appears",
      "simulation_running": "Progress bar (progress.jsx) with indeterminate shimmer (background-position animation)"
    },
    "reduced_motion": "If prefers-reduced-motion: disable loops, keep only instant state changes"
  },

  "page_level_direction": {
    "landing_mission_control": {
      "hero": "Left: headline + anomaly callouts; Right: rotating globe/India silhouette + live feed indicators",
      "cta": "Role-based CTAs (Policymaker / Scientist / Farmer) as three stacked buttons with short descriptors",
      "data_testid": {
        "role_cta": "landing-role-cta",
        "live_feed": "landing-live-feed"
      }
    },
    "auth": {
      "layout": "Split-screen: left mission imagery panel (subtle) + right login card",
      "role_selector": "radio-group.jsx with 3 roles; show role-specific copy",
      "data_testid": {
        "login_form": "login-form",
        "role_selector": "auth-role-selector",
        "submit": "auth-submit"
      }
    },
    "main_dashboard": {
      "must_have": [
        "Sticky top KPI strip",
        "Map with layer legend + hover inspector",
        "Right rail with Context/Layers/Provenance/Exports tabs",
        "Bottom row: 2–3 charts (monsoon, anomaly, alerts)"
      ]
    }
  },

  "imagery": {
    "image_urls": {
      "backgrounds": [
        {
          "category": "landing-hero-backdrop",
          "description": "Use a subtle starfield/space texture behind hero; keep opacity low and avoid busy patterns.",
          "url": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=2400&q=80"
        }
      ],
      "satellite_earth": [
        {
          "category": "landing-globe-visual",
          "description": "Earth-from-space imagery for hero/globe module; apply dark overlay + noise.",
          "url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2400&q=80"
        }
      ],
      "india_context": [
        {
          "category": "auth-side-panel",
          "description": "Abstract night-lights / satellite style image; keep it subtle.",
          "url": "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=2400&q=80"
        }
      ]
    }
  },

  "accessibility": {
    "wcag": "AA minimum",
    "rules": [
      "Text contrast >= 4.5:1 on dark surfaces",
      "Non-text UI contrast >= 3:1 (borders, focus rings)",
      "Never rely on color alone for alert severity: include label + icon (lucide-react)",
      "Keyboard focus: use visible ring (var(--focus-ring))",
      "Tooltips for dense abbreviations (LPA, SPI, ERA5)"
    ]
  },

  "performance_notes": {
    "map": [
      "Prefer vector overlays with simplified geometries for district boundaries",
      "Debounce hover inspector updates",
      "Use memoized selectors for layer styling"
    ],
    "charts": [
      "Avoid rendering >3 heavy charts simultaneously on mobile; use Tabs",
      "Use Skeleton while fetching"
    ]
  },

  "instructions_to_main_agent": [
    "Force dark mode: add 'dark' class at root and replace default shadcn tokens in /app/frontend/src/index.css with the tokens_hsl above.",
    "Do NOT use centered app container styles (remove/avoid .App-header centering patterns).",
    "Implement a reusable HUDPanel wrapper (Card-based) and use it everywhere for consistent mission-control modules.",
    "Every metric must show: value + unit + timestamp (IST + UTC optional) + provenance badge.",
    "Use Leaflet with CartoDB Dark Matter tiles; style boundaries and choropleths per map_and_geospatial section.",
    "Use Recharts with mono axes + subtle gridlines; tooltips must include provenance.",
    "Add framer-motion for ambient radar sweep and alert pulses; respect prefers-reduced-motion.",
    "Add data-testid to all interactive elements and key info readouts (KPIs, alerts, map legend, export buttons)."
  ]
}

<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
