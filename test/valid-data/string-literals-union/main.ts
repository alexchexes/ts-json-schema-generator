export type FiasAddressFiasLevel =
  | '1'
  | '3'
  | '4'
  | '5'
  | '6'
  | '65'
  | '7'
  | '8';

export type AddressFiasLevel =
  | '0'
  | FiasAddressFiasLevel
  | '75'
  | '9'
  | '-1';

export type CleanAddressFiasLevel =
  | '0'
  | FiasAddressFiasLevel
  | '9'
  | '90'
  | '91'
  | '-1';
