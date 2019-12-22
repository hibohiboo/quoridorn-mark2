import { Point } from "@/@types/address";

export type TouchRequest = {
  collection: string;
  id?: string;
};
export type TouchModifyRequest = TouchRequest & {
  id: string;
};
export type ReleaseTouchRequest = TouchModifyRequest;

export type CreateDataRequest = TouchModifyRequest & {
  data: any;
};
export type DeleteDataRequest = TouchModifyRequest;
export type UpdateDataRequest = CreateDataRequest;

export type DataReference = {
  type: string;
  docId: string;
};

export type AddObjectInfo = {
  dropWindow: string;
  point: Point;
};
