import { registerEnumType } from '@nestjs/graphql';
import { DateRangePresetEnum } from '../dto/date-range.input';

export { DateRangePresetEnum };

registerEnumType(DateRangePresetEnum, {
  name: 'DateRangePreset',
  description:
    'Preset date ranges for report queries. CUSTOM uses the explicit from/to bounds.',
});
