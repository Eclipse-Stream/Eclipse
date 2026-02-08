// Domain Layer - Validators
// Zod schemas for validation
export { PageSchema, type PageValidated } from "./navigation.validator";
export {
  DeviceGUIDSchema,
  ResolutionSchema,
  RefreshRateSchema,
  VirtualDisplayConfigSchema,
  isValidDeviceGUID,
  parseDeviceGUID,
  safeParseDeviceGUID,
} from "./vdd.schema";
