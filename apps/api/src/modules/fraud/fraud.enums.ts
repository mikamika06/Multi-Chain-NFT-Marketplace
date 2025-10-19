import { registerEnumType } from '@nestjs/graphql';

export enum FraudEntityEnum {
  COLLECTION = 'COLLECTION',
  LISTING = 'LISTING',
  TOKEN = 'TOKEN',
  USER = 'USER',
}

registerEnumType(FraudEntityEnum, {
  name: 'FraudEntity',
  description: 'Entity types supported for fraud detection workflows.',
});
