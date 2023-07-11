import { createProjector } from "maquette";
import { jsx } from "maquette-jsx";
import {
  afterCreateEventHandler,
  combine,
  setAttributes,
} from "../utils/events";
import { highlight } from "../utils/highlight";

interface DateTimeFormatOptions extends Intl.DateTimeFormatOptions {
  fractionalSecondDigits?: number | undefined;
}

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
const userLocales = new Set<string>(
  localStorage.getItem("userLocales")?.split("#") ?? []
);

// Date to format
const date = new Date(2023, 2, 2, 0, 0, 0, 0);

function getOption<K extends keyof DateTimeFormatOptions>(
  params: URLSearchParams,
  key: K,
  defaultValue: DateTimeFormatOptions[K]
): DateTimeFormatOptions[K] | undefined {
  return params.has(key)
    ? (params.get(key) as DateTimeFormatOptions[K]) || undefined
    : defaultValue;
}

const predefinedKeys = new Set<keyof DateTimeFormatOptions>([
  "dateStyle",
  "timeStyle",
]);
const fineGrainKeys = new Set<
  keyof DateTimeFormatOptions | "fractionalSecondDigits"
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

type Config = {
  locale: string;
  advanced: boolean;
  options: DateTimeFormatOptions;
};

const defaultConfig: Config = {
  locale: "en-US",
  advanced: true,
  options: {
    dateStyle: "medium",
    timeStyle: "medium",
    weekday: undefined,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    era: undefined,
    hour12: undefined,
    hourCycle: undefined,
    timeZoneName: undefined,
    fractionalSecondDigits: undefined,
  },
};

// Initial selected options
let config = updateConfigFromURL();

function reset() {
  userLocales.clear();
  localStorage.removeItem("userLocales");
  config = defaultConfig;
  pushState();
  projector.scheduleRender();
}

function updateConfigFromURL(): Config {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const locale = params.get("locale") || defaultConfig.locale;

  if (locale && !locales.has(locale) && !userLocales.has(locale)) {
    userLocales.add(locale);
    localStorage.setItem("userLocales", Array.from(userLocales).join("#"));
  }

  const defaultOptions = defaultConfig.options;

  return {
    locale,
    advanced: params.has("advanced")
      ? params.get("advanced") === "true"
      : defaultConfig.advanced,
    options: {
      dateStyle: getOption(params, "dateStyle", defaultOptions.dateStyle),
      timeStyle: getOption(params, "timeStyle", defaultOptions.timeStyle),
      weekday: getOption(params, "weekday", defaultOptions.weekday),
      year: getOption(params, "year", defaultOptions.year),
      month: getOption(params, "month", defaultOptions.month),
      day: getOption(params, "day", defaultOptions.day),
      hour: getOption(params, "hour", defaultOptions.hour),
      minute: getOption(params, "minute", defaultOptions.minute),
      second: getOption(params, "second", defaultOptions.second),
      era: getOption(params, "era", defaultOptions.era),
      hour12: getOption(params, "hour12", defaultOptions.hour12),
      hourCycle: getOption(params, "hourCycle", defaultOptions.hourCycle),
      timeZoneName: getOption(
        params,
        "timeZoneName",
        defaultOptions.timeZoneName
      ),
      fractionalSecondDigits: getOption(
        params,
        "fractionalSecondDigits",
        defaultOptions.fractionalSecondDigits
      ),
    } as DateTimeFormatOptions,
  };
}

function addLocale(locale: string) {
  if (locales.has(locale)) {
    return;
  }

  try {
    new Intl.DateTimeFormat(locale);
    userLocales.add(locale);
    localStorage.setItem("userLocales", Array.from(userLocales).join("#"));
    updateLocale(locale);
  } catch (e) {
    console.error("Couldn't add locale", e);
  }
}

function deleteLocale(locale: string) {
  if (!userLocales.has(locale)) {
    return;
  }

  userLocales.delete(locale);
  localStorage.setItem("userLocales", Array.from(userLocales).join("#"));

  if (config.locale === locale) {
    updateLocale("en");
  }
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
  (document.getElementById("styleFromWebmapSelect")! as any).value = null;
  pushState();
  projector.scheduleRender();
}

function pushState() {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("locale", config.locale);
  url.searchParams.set("advanced", String(config.advanced));
  url.searchParams.set("dateStyle", config.options.dateStyle ?? "");
  url.searchParams.set("timeStyle", config.options.timeStyle ?? "");
  url.searchParams.set("weekday", config.options.weekday ?? "");
  url.searchParams.set("year", config.options.year ?? "");
  url.searchParams.set("month", config.options.month ?? "");
  url.searchParams.set("day", config.options.day ?? "");
  url.searchParams.set("hour", config.options.hour ?? "");
  url.searchParams.set("minute", config.options.minute ?? "");
  url.searchParams.set("second", config.options.second ?? "");
  url.searchParams.set("era", config.options.era ?? "");
  url.searchParams.set("timeZoneName", config.options.timeZoneName ?? "");
  url.searchParams.set("hour12", String(config.options.hour12 ?? ""));
  url.searchParams.set("hourCycle", config.options.hourCycle ?? "");
  url.searchParams.set(
    "fractionalSecondDigits",
    String(config.options.fractionalSecondDigits ?? "")
  );
  history.pushState(null, "", url);
}

window.addEventListener("popstate", (event) => {
  config = updateConfigFromURL();
  projector.scheduleRender();
});

function getDateTimeFormatOptions(advanced = config.advanced) {
  const renderedFormatOptions: DateTimeFormatOptions = {
    ...config.options,
  };

  const keys = Object.keys(config.options) as (keyof DateTimeFormatOptions)[];

  for (const key of keys) {
    if (!advanced && fineGrainKeys.has(key)) {
      delete renderedFormatOptions[key as keyof DateTimeFormatOptions];
    } else if (advanced && predefinedKeys.has(key)) {
      delete renderedFormatOptions[key as keyof DateTimeFormatOptions];
    } else if (
      config.options[key] === "none" ||
      config.options[key] === "auto"
    ) {
      delete renderedFormatOptions[key as keyof DateTimeFormatOptions];
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

  const fineGrainFormattedDate = getFormattedDate(
    config.locale,
    getDateTimeFormatOptions(true)
  );

  const predefinedFormattedDate = getFormattedDate(
    config.locale,
    getDateTimeFormatOptions(false)
  );

  return (
    <calcite-shell theme="light">
      <calcite-panel heading="Intl.DateTimeFormat">
        <calcite-action
          slot="header-actions-end"
          icon="refresh"
          text="Reset changes made to Properties"
          appearance="solid"
          scale="m"
          calcite-hydrated=""
          onclick={reset}
        ></calcite-action>
        <div style="background-color: #f0f0f0; width: 100%; height: 100%; display: flex; flex-direction: row; justify-content: center; gap: 16px;">
          <calcite-block heading="Locale" open style="width: 200px">
            {renderLocaleSelect(locales, config.locale)}
          </calcite-block>
          <div style="display: flex; flex-direction: column;">
            <calcite-block
              heading="WebMap date formats"
              open
              style="width: 500px"
            >
              {renderWebMapStyleSelect()}
            </calcite-block>
            <calcite-block heading="Style" open style="width: 500px">
              {renderStyleOptions(renderedFormatOptions)}
            </calcite-block>
            <calcite-block heading="Options" open style="width: 500px">
              {renderCommonOptions(renderedFormatOptions)}
            </calcite-block>
          </div>
          <div style="display: flex; flex-direction: column; width: 600px">
            <calcite-block heading="Formatting output" open>
              <calcite-label>
                with fine grain options
                <calcite-input-text
                  afterCreate={setAttributes({ "read-only": "true" })}
                  value={fineGrainFormattedDate}
                ></calcite-input-text>
              </calcite-label>
              <calcite-label>
                with predefined style
                <calcite-input-text
                  afterCreate={setAttributes({ "read-only": "true" })}
                  value={predefinedFormattedDate}
                ></calcite-input-text>
              </calcite-label>
            </calcite-block>
            <calcite-block heading="Code" collapsible>
              {highlight("javascript", formattedSnippet)}
              <div style="display: flex; flex-direction: row; justify-content: space-between;">
                <calcite-button
                  appearance="outline"
                  icon-start="copyToClipboard"
                  color="light"
                  scale="s"
                  onclick={() => copyToClipboard(formattedSnippet)}
                >
                  Copy to clipboard
                </calcite-button>
                <calcite-link
                  target="_blank"
                  icon-end="launch"
                  style="align-self: end"
                  href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat"
                >
                  <code>Intl.DateTimeFormat</code> on MDN
                </calcite-link>
              </div>
            </calcite-block>
          </div>
        </div>
      </calcite-panel>
    </calcite-shell>
  );
}

function renderLocaleSelect(locales: Set<string>, currentLocale: string) {
  return [
    <calcite-list
      selection-mode="single-persist"
      afterCreate={afterCreateEventHandler(
        "calciteListChange",
        (event: any) => {
          updateLocale(event.target.selectedItems[0].value);
        }
      )}
    >
      {Array.from(locales, (locale) => (
        <calcite-list-item
          label={locale}
          value={locale}
          selected={locale === currentLocale}
          key={locale}
        ></calcite-list-item>
      ))}
      {Array.from(userLocales, (locale) => (
        <calcite-list-item
          label={locale}
          value={locale}
          selected={locale === currentLocale}
          key={locale}
          closable
          afterCreate={afterCreateEventHandler(
            "calciteListItemClose",
            (event: any) => deleteLocale(event.target.value)
          )}
        ></calcite-list-item>
      ))}
    </calcite-list>,
    <calcite-input-text
      placeholder="Add locale"
      icon="language"
      afterCreate={afterCreateEventHandler(
        "calciteInputTextChange",
        (event: any) => {
          addLocale(event.target.value);
          event.target.value = "";
        }
      )}
    ></calcite-input-text>,
  ];
}

function renderCommonOptions(renderedFormatOptions: DateTimeFormatOptions) {
  return [
    renderRadioButtonGroup(
      "hour12",
      ["true", "false"],
      "auto",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "hourCycle",
      ["h11", "h12", "h23", "h24"],
      "auto",
      renderedFormatOptions
    ),
  ];
}

function renderStyleOptions(renderedFormatOptions: DateTimeFormatOptions) {
  return (
    <calcite-tabs layout="center">
      <calcite-tab-nav slot="title-group">
        <calcite-tab-title
          selected={config.advanced}
          afterCreate={afterCreateEventHandler("calciteTabsActivate", () => {
            updateFormatStyle(true);
          })}
        >
          Fine grain
        </calcite-tab-title>
        <calcite-tab-title
          selected={!config.advanced}
          afterCreate={afterCreateEventHandler("calciteTabsActivate", () => {
            updateFormatStyle(false);
          })}
        >
          Predefined styles
        </calcite-tab-title>
      </calcite-tab-nav>
      <calcite-tab selected={config.advanced}>
        <div style="display: flex; gap: 8px; flex-direction: column; padding-top: 8px;">
          {renderAdvancedStyleFormatOptions(renderedFormatOptions)}
        </div>
      </calcite-tab>
      <calcite-tab selected={!config.advanced}>
        {renderStyleFormatOptions(renderedFormatOptions)}
      </calcite-tab>
    </calcite-tabs>
  );
}

function renderStyleFormatOptions(
  renderedFormatOptions: DateTimeFormatOptions
) {
  return [
    renderRadioButtonGroup(
      "dateStyle",
      ["full", "long", "medium", "short"],
      "none",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "timeStyle",
      ["full", "long", "medium", "short"],
      "none",
      renderedFormatOptions
    ),
  ];
}

const shortDate: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
};

const longMonthDayYear: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

const dayShortMonthYear: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const longDate: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  weekday: "long",
  day: "numeric",
};

const shortTime: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "numeric",
};

const longTime: Intl.DateTimeFormatOptions = {
  ...shortTime,
  second: "numeric",
};

const formats: Record<string, Intl.DateTimeFormatOptions> = {
  "short-date": shortDate,
  "short-date-short-time": {
    ...shortDate,
    ...shortTime,
  },
  "short-date-short-time-24": {
    ...shortDate,
    ...shortTime,
    hour12: false,
  },
  "short-date-long-time": {
    ...shortDate,
    ...longTime,
  },
  "short-date-long-time-24": {
    ...shortDate,
    ...longTime,
    hour12: false,
  },
  "short-date-le": shortDate,
  "short-date-le-short-time": {
    ...shortDate,
    ...shortTime,
  },
  "short-date-le-short-time-24": {
    ...shortDate,
    ...shortTime,
    hour12: false,
  },
  "short-date-le-long-time": {
    ...shortDate,
    ...longTime,
  },
  "short-date-le-long-time-24": {
    ...shortDate,
    ...longTime,
    hour12: false,
  },
  "long-month-day-year": longMonthDayYear,
  "long-month-day-year-short-time": {
    ...longMonthDayYear,
    ...shortTime,
  },
  "long-month-day-year-short-time-24": {
    ...longMonthDayYear,
    ...shortTime,
    hour12: false,
  },
  "long-month-day-year-long-time": {
    ...longMonthDayYear,
    ...longTime,
  },
  "long-month-day-year-long-time-24": {
    ...longMonthDayYear,
    ...longTime,
    hour12: false,
  },
  "day-short-month-year": dayShortMonthYear,
  "day-short-month-year-short-time": {
    ...dayShortMonthYear,
    ...shortTime,
  },
  "day-short-month-year-short-time-24": {
    ...dayShortMonthYear,
    ...shortTime,
    hour12: false,
  },
  "day-short-month-year-long-time": {
    ...dayShortMonthYear,
    ...longTime,
  },
  "day-short-month-year-long-time-24": {
    ...dayShortMonthYear,
    ...longTime,
    hour12: false,
  },
  "long-date": longDate,
  "long-date-short-time": {
    ...longDate,
    ...shortTime,
  },
  "long-date-short-time-24": {
    ...longDate,
    ...shortTime,
    hour12: false,
  },
  "long-date-long-time": {
    ...longDate,
    ...longTime,
  },
  "long-date-long-time-24": {
    ...longDate,
    ...longTime,
    hour12: false,
  },
  "long-month-year": {
    month: "long",
    year: "numeric",
  },
  "short-month-year": {
    month: "short",
    year: "numeric",
  },
  year: {
    year: "numeric",
  },
  "short-time": shortTime,
  "long-time": longTime,
};

function renderWebMapStyleSelect() {
  return (
    <calcite-combobox
      id="styleFromWebmapSelect"
      placeholder="Select a web-map date format"
      afterCreate={combine(
        (el: any) => {
          el.clearDisabled = true;
          el.selectionMode = "single";
        },
        afterCreateEventHandler("calciteComboboxClose", (event: any) => {
          const format = formats[event.target.value];
          config.advanced = true;
          config.options = {
            ...format,
            // Preserves the predefined key values
            ...Object.assign(
              {},
              ...Array.from(predefinedKeys, (key) => ({
                [key]: config.options[key],
              }))
            ),
          };
          pushState();
          projector.scheduleRender();
        })
      )}
    >
      {Array.from(Object.keys(formats), (key) => {
        return (
          <calcite-combobox-item
            value={key}
            text-label={key}
          ></calcite-combobox-item>
        );
      })}
    </calcite-combobox>
  );
}

function renderAdvancedStyleFormatOptions(
  renderedFormatOptions: DateTimeFormatOptions
) {
  return [
    renderRadioButtonGroup(
      "weekday",
      ["long", "short", "narrow"],
      "none",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "era",
      ["long", "short", "narrow"],
      "none",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "year",
      ["numeric", "2-digit"],
      "none",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "month",
      ["numeric", "2-digit", "long", "short", "narrow"],
      "none",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "day",
      ["numeric", "2-digit"],
      "none",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "hour",
      ["numeric", "2-digit"],
      "none",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "minute",
      ["numeric", "2-digit"],
      "none",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "second",
      ["numeric", "2-digit"],
      "none",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "fractionalSecondDigits",
      ["1", "2", "3"],
      "none",
      renderedFormatOptions
    ),
    renderRadioButtonGroup(
      "timeZoneName",
      [
        "long",
        "short",
        "shortOffset",
        "longOffset",
        "shortGeneric",
        "longGeneric",
      ],
      "none",
      renderedFormatOptions
    ),
  ];
}

function renderRadioButtonGroup<K extends keyof DateTimeFormatOptions>(
  property: K,
  values: string[],
  undefinedLabel: string,
  formatOptions: DateTimeFormatOptions
) {
  return (
    <calcite-label key={property}>
      {property}
      <calcite-segmented-control
        afterCreate={radioHandler(property)}
        scale="s"
        width="full"
      >
        <calcite-segmented-control-item
          value={undefined}
          checked={formatOptions[property] === undefined}
        >
          {undefinedLabel}
        </calcite-segmented-control-item>
        {values.map((value) => {
          return (
            <calcite-segmented-control-item
              value={value}
              checked={String(formatOptions[property]) === value}
            >
              {value}
            </calcite-segmented-control-item>
          );
        })}
      </calcite-segmented-control>
    </calcite-label>
  );
}

function radioHandler<K extends keyof DateTimeFormatOptions>(prop: K) {
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
  .filter((key) => options[key] != null)
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
