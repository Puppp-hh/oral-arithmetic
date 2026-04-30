declare const wx: any;
declare function App<T = any>(options: any): void;
declare function Page(options: any): void;
declare function getApp<T = any>(): T;

declare namespace WechatMiniprogram {
  interface BaseEvent {
    currentTarget: {
      dataset: Record<string, any>;
    };
    target: {
      dataset: Record<string, any>;
    };
  }

  interface Touch extends BaseEvent {}

  interface Input extends BaseEvent {
    detail: {
      value: string;
    };
  }

  interface PickerChange extends BaseEvent {
    detail: {
      value: string | number;
    };
  }

  interface SwitchChange extends BaseEvent {
    detail: {
      value: boolean;
    };
  }
}
