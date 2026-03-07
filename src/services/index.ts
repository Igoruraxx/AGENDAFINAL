/**
 * Public barrel for the services package.
 */

export type {
  IStudentService,
  IAppointmentService,
  IPaymentService,
  IEvolutionService,
  IDataServices,
  Payment,
  PaymentInput,
  AppointmentInput,
  AppointmentUpdate,
  EvolutionFilters,
} from './IDataService';

export { DataServiceProvider, useDataServices } from './DataServiceContext';
