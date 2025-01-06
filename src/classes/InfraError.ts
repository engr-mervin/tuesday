import { randomUUID } from "crypto";

export class InfraError {
  public origin: string;
  public id: string;
  public baseError: Error;

  constructor(_origin: string, _error: Error) {
    this.id = randomUUID();
    this.baseError = _error;
    this.origin = _origin;
  }
}
