import { ProjectionOptions, VNode } from "maquette";

type AfterCreateCallback = (
  el: Element,
  projectionOptions: ProjectionOptions,
  vnodeSelector: VNode["vnodeSelector"],
  properties: VNode["properties"],
  children: VNode["children"]
) => void;

export function combine(
  ...afterCreateCallbacks: AfterCreateCallback[]
): AfterCreateCallback {
  return (
    el: Element,
    projectionOptions: ProjectionOptions,
    vnodeSelector: VNode["vnodeSelector"],
    properties: VNode["properties"],
    children: VNode["children"]
  ) => {
    for (const callback of afterCreateCallbacks) {
      callback(el, projectionOptions, vnodeSelector, properties, children);
    }
  };
}

export function setAttributes(
  attr: Record<string, string>
): AfterCreateCallback {
  return (
    el: Element,
    projectionOptions: ProjectionOptions,
    vnodeSelector: VNode["vnodeSelector"],
    properties: VNode["properties"],
    children: VNode["children"]
  ) => {
    for (const key of Object.keys(attr)) {
      el.setAttribute(key, attr[key]);
    }
  };
}

export function afterCreateEventHandler(
  type: string,
  listener: EventListenerOrEventListenerObject
): AfterCreateCallback {
  return (
    el: Element,
    projectionOptions: ProjectionOptions,
    vnodeSelector: VNode["vnodeSelector"],
    properties: VNode["properties"],
    children: VNode["children"]
  ) => {
    el.addEventListener(type, listener);

    const afterRemoved = properties?.afterRemoved;

    if (properties) {
      properties.afterRemoved = () => {
        afterRemoved?.(el);
        el.removeEventListener(type, listener);
      };
    }
  };
}
