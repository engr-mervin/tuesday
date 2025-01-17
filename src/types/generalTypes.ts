export interface ErrorObject {
  name: string;
  errors: (string | ErrorObject)[];
}

//NOTE: The decision to use Optional type instead of optional field "?" syntax
//is for the code to be more explicit that these fields are optional, furthermore, if we use "?"
//syntax, then adding those fields to the object will result in more cluttered code:
//e.g. if(field){obj[field] = value}, as compared to just declaring the whole object in one place.
export type Optional<T> = T | undefined;
export type ValuesOf<T extends Record<string, unknown>> = (T)[keyof T];
export type KeysOf<T extends Record<string, unknown>> = keyof T;

export type ValidationResult<T = undefined, U = (ErrorObject | string)[]> =
  | (T extends undefined
      ? {
          status: "success";
        }
      : {
          status: "success";
          data: T;
        })
  | FailedValidationResult<U>;

export type FailedValidationResult<U = (ErrorObject | string)[]> = {
  status: "fail";
  data: U;
};

export type Time = { readonly __brand: unique symbol } & string;
export type YYYYMMDDString = { readonly __brand: unique symbol } & string;
