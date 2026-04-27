import { GetMovementsOutputType, GetCategoriesOutputType } from 'zite-endpoints-sdk';

export type Movement = GetMovementsOutputType['movements'][0] & {
  dataObject?: Date;
};

export type Category = GetCategoriesOutputType['categories'][0];

export type MovementType = 'Receita' | 'Pagamento';
export type PaymentType = 'Dinheiro' | 'Transferência Bancária';

export type MovementFilters = {
  tipo?: MovementType;
  seccao?: string;
  categoria?: string;
  subCategoria?: string;
  tipoPagamento?: PaymentType;
  entregueTesouraria?: boolean;
  pendenteSeccao?: boolean;
};
