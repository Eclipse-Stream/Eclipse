// Domain Interface - Service Controller
// Abstracts system service control operations (start/stop/restart)

export interface ServiceOperationResult {
  success: boolean;
  error?: string;
}

export interface IServiceController {
  /**
   * Start the target service
   * @returns Operation result with success flag and optional error message
   */
  start(): Promise<ServiceOperationResult>;

  /**
   * Stop the target service
   * @returns Operation result with success flag and optional error message
   */
  stop(): Promise<ServiceOperationResult>;

  /**
   * Restart the target service (stop then start)
   * @returns Operation result with success flag and optional error message
   */
  restart(): Promise<ServiceOperationResult>;
}
