import { createProjector } from "maquette";
import { jsx } from "maquette-jsx";
import { afterCreateEventHandler } from "../utils/events";
import { highlight } from "../utils/highlight";

// locales exposed through the UI
const locales = new Set<string>([
  "en",
  "en-US",
  "en-GB",
  "fr-FR",
  "fr-CA",
  "es",
  "es-ES",
  "es-MX",
]);

// Date to format
const date = Date.UTC(2020, 2, 2, 22, 0, 0, 0);

const url = new URL(window.location.href);
const params = url.searchParams;

function getOption<K extends keyof Intl.DateTimeFormatOptions>(
  key: K
): Intl.DateTimeFormatOptions[K] | undefined {
  return (params.get(key) as Intl.DateTimeFormatOptions[K] | null) || undefined;
}

const predefinedKeys = new Set<keyof Intl.DateTimeFormatOptions>([
  "dateStyle",
  "timeStyle",
]);
const fineGrainKeys = new Set<
  keyof Intl.DateTimeFormatOptions | "fractionalSecondDigits"
>([
  "era",
  "year",
  "month",
  "day",
  "dayPeriod",
  "hour",
  "minute",
  "second",
  "weekday",
  "timeZoneName",
  "fractionalSecondDigits",
]);

// Initial selected options
let config = updateConfigFromURL();

function updateConfigFromURL() {
  return {
    locale: params.get("locale") || "en-US",
    advanced: params.get("advanced") === "true",
    options: {
      dateStyle: getOption("dateStyle") ?? "medium",
      timeStyle: getOption("timeStyle") ?? "medium",
      weekday: getOption("weekday") ?? "long",
      year: getOption("year") ?? "numeric",
      month: getOption("month") ?? "numeric",
      day: getOption("day") ?? "numeric",
      hour: getOption("hour") ?? "numeric",
      minute: getOption("minute") ?? "numeric",
      second: getOption("second") ?? "numeric",
      era: getOption("era") ?? "none",
      hour12: getOption("hour12") ?? "auto",
    } as Intl.DateTimeFormatOptions,
  };
}

function updateLocale(locale: string) {
  config.locale = locale;
  pushState();
  projector.scheduleRender();
}

function updateFormatStyle(advanced: boolean) {
  config.advanced = advanced;
  pushState();
  projector.scheduleRender();
}

function updateFormatOptions(options: Partial<Intl.DateTimeFormatOptions>) {
  Object.assign(config.options, options);
  pushState();
  projector.scheduleRender();
}

function pushState() {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("locale", config.locale);
  url.searchParams.set("advanced", String(config.advanced));
  url.searchParams.set("dateStyle", config.options.dateStyle ?? "none");
  url.searchParams.set("timeStyle", config.options.timeStyle ?? "none");
  url.searchParams.set("weekday", config.options.weekday ?? "none");
  url.searchParams.set("year", config.options.year ?? "none");
  url.searchParams.set("month", config.options.month ?? "none");
  url.searchParams.set("day", config.options.day ?? "none");
  url.searchParams.set("hour", config.options.hour ?? "none");
  url.searchParams.set("minute", config.options.minute ?? "none");
  url.searchParams.set("second", config.options.second ?? "none");
  url.searchParams.set("era", config.options.era ?? "auto");
  history.pushState(null, "", url);
}

window.addEventListener("popstate", (event) => {
  config = updateConfigFromURL();
  projector.scheduleRender();
});

function getDateTimeFormatOptions() {
  const renderedFormatOptions: Intl.DateTimeFormatOptions = {
    ...config.options,
  };

  const keys = Object.keys(
    config.options
  ) as (keyof Intl.DateTimeFormatOptions)[];

  for (const key of keys) {
    if (!config.advanced && fineGrainKeys.has(key)) {
      delete renderedFormatOptions[key as keyof Intl.DateTimeFormatOptions];
    } else if (config.advanced && predefinedKeys.has(key)) {
      delete renderedFormatOptions[key as keyof Intl.DateTimeFormatOptions];
    } else if (
      config.options[key] === "none" ||
      config.options[key] === "auto"
    ) {
      delete renderedFormatOptions[key as keyof Intl.DateTimeFormatOptions];
    }
  }

  return renderedFormatOptions;
}

//Renders the application content
function render() {
  const renderedFormatOptions = getDateTimeFormatOptions();

  const formattedSnippet = getFormatSnippet(
    config.locale,
    renderedFormatOptions
  );
  const formattedDate = getFormattedDate(config.locale, renderedFormatOptions);

  return (
    <calcite-shell theme="light">
      <calcite-panel heading="Intl.DateTimeFormat">
        {/* <header slot="header">
        <h2 style="margin-left: 30px">Intl.DateTimeFormat</h2>
      </header> */}
        <div style="background-color: #f0f0f0; width: 100%; height: 100%; display: flex; flex-direction: row; justify-content: center; gap: 16px;">
          <calcite-block open style="width: 400px">
            {/* <div style="background: white; padding: 12px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3)"> */}
            {renderLocaleSelect()}
            {renderStyleOptions(renderedFormatOptions)}
            {renderCommonOptions(renderedFormatOptions)}
          </calcite-block>
          <div style="display: flex; flex-direction: column; width: 600px">
            <calcite-block heading="Result" open>
              <p style="font-size: large; max-width: 600px">{formattedDate}</p>
            </calcite-block>
            <calcite-block heading="Code" open>
              {highlight("javascript", formattedSnippet)}
              <calcite-button
                appearance="outline"
                icon-start="copyToClipboard"
                color="light"
                scale="s"
                onclick={() => copyToClipboard(formattedSnippet)}
              >
                Copy to clipboard
              </calcite-button>
            </calcite-block>
            <calcite-block heading="Learn More" open>
              <a
                target="_blank"
                href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat"
              >
                <code>Intl.DateTimeFormat</code> on MDN
              </a>
            </calcite-block>
          </div>
        </div>
      </calcite-panel>
    </calcite-shell>
  );
}

function renderLocaleSelect() {
  return (
    <calcite-label key="locale">
      Locale
      <calcite-select
        scale="s"
        afterCreate={afterCreateEventHandler(
          "calciteSelectChange",
          (event: any) => {
            updateLocale(event.target.selectedOption.value);
          }
        )}
      >
        {Array.from(locales, (locale) => (
          <calcite-option
            label={locale}
            value={locale}
            selected={config.locale === locale}
          ></calcite-option>
        ))}
      </calcite-select>
    </calcite-label>
  );
}

function renderCommonOptions(
  renderedFormatOptions: Intl.DateTimeFormatOptions
) {
  return (
    <calcite-block-section open text="Style" toggle-display="button">
      {renderRadioButtonGroup(
        "hour12",
        ["auto", "true", "false"],
        renderedFormatOptions
      )}
    </calcite-block-section>
  );
}

function renderStyleOptions(renderedFormatOptions: Intl.DateTimeFormatOptions) {
  return (
    <calcite-block-section open text="Style" toggle-display="button">
      <calcite-tabs layout="center">
        <calcite-tab-nav slot="title-group">
          <calcite-tab-title
            selected={!config.advanced}
            afterCreate={afterCreateEventHandler("calciteTabsActivate", () => {
              updateFormatStyle(false);
            })}
          >
            Predefined styles
          </calcite-tab-title>
          <calcite-tab-title
            selected={config.advanced}
            afterCreate={afterCreateEventHandler("calciteTabsActivate", () => {
              updateFormatStyle(true);
            })}
          >
            Fine grain
          </calcite-tab-title>
        </calcite-tab-nav>
        <calcite-tab selected={!config.advanced}>
          {renderStyleFormatOptions(renderedFormatOptions)}
        </calcite-tab>
        <calcite-tab selected={config.advanced}>
          {renderAdvancedStyleFormatOptions(renderedFormatOptions)}
        </calcite-tab>
      </calcite-tabs>
    </calcite-block-section>
  );
}

function renderStyleFormatOptions(
  renderedFormatOptions: Intl.DateTimeFormatOptions
) {
  return [
    renderRadioButtonGroup(
      "dateStyle",
      ["none", "full", "long", "medium", "short"],
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "timeStyle",
      ["none", "full", "long", "medium", "short"],
      renderedFormatOptions
    ),
  ];
}

function renderAdvancedStyleFormatOptions(
  renderedFormatOptions: Intl.DateTimeFormatOptions
) {
  return [
    renderRadioButtonGroup(
      "weekday",
      ["none", "long", "short", "narrow"],
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "era",
      ["none", "long", "short", "narrow"],
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "year",
      ["none", "numeric", "2-digit"],
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "month",
      ["none", "numeric", "2-digit", "long", "short", "narrow"],
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "day",
      ["none", "numeric", "2-digit"],
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "hour",
      ["none", "numeric", "2-digit"],
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "minute",
      ["none", "numeric", "2-digit"],
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "second",
      ["none", "numeric", "2-digit"],
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "timeZoneName",
      ["none", "long", "short"],
      renderedFormatOptions
    ),
  ];
}

function renderRadioButtonGroup<K extends keyof Intl.DateTimeFormatOptions>(
  property: K,
  values: string[],
  formatOptions: Intl.DateTimeFormatOptions
) {
  return (
    <calcite-label key={property}>
      {property}
      <calcite-segmented-control
        afterCreate={radioHandler(property)}
        scale="s"
        width="full"
      >
        {values.map((value) => {
          const checked =
            formatOptions[property] ===
            (value === "none" || value === "auto" ? undefined : value);
          return (
            <calcite-segmented-control-item value={value} checked={checked}>
              {value}
            </calcite-segmented-control-item>
          );
        })}
      </calcite-segmented-control>
    </calcite-label>
  );
}

function radioHandler<K extends keyof Intl.DateTimeFormatOptions>(prop: K) {
  return afterCreateEventHandler(
    "calciteSegmentedControlChange",
    (event: any) => {
      let value = event.target.value;

      if (value === "true" || value === "false") {
        value = value === "true";
      }

      updateFormatOptions({
        [prop]: value,
      });
    }
  );
}

function getFormatSnippet(
  locale: string,
  options: Partial<Intl.DateTimeFormatOptions>
) {
  return `new Intl.DateTimeFormat('${locale}', {
${(Object.keys(options) as (keyof Intl.DateTimeFormatOptions)[])
  .map((key) => {
    if (typeof options[key as keyof Intl.DateTimeFormatOptions] === "string") {
      return `  ${key}: '${options[key]}'`;
    } else {
      return `  ${key}: ${options[key]}`;
    }
  })
  .join(",\n")}
});`;
}

function copyToClipboard(newClip: string) {
  const input = document.createElement("textarea");
  input.innerText = newClip;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

function getFormattedDate(
  locale: string,
  options: Partial<Intl.DateTimeFormatOptions>
) {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return "";
  }
}

const projector = createProjector();
projector.append(document.body, render);
