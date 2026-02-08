// Domain Layer - Sunshine Types
// Defines the possible states of the Sunshine service

export enum SunshineStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  STREAMING = 'STREAMING',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  UNKNOWN = 'UNKNOWN',
}

export type SunshineStatusType = SunshineStatus
