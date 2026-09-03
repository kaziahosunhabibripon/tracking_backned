import { Query, Resolver } from '@nestjs/graphql';
import { Public } from '../../common/decorators/public.decorator';
import {
  CampaignOptions,
  SelectOption,
} from './entities/campaign-options.entity';

/**
 * Public dropdown data. Partners/categories/trafficTypes are network-managed
 * constants today; when Settings → Offer Category / Traffic Type becomes
 * dynamic (Phase 7), swap these to DB lookups behind the same shape.
 */
@Resolver(() => CampaignOptions)
export class CampaignOptionsResolver {
  private readonly partners: SelectOption[] = [
    { value: 'diceads-direct', label: 'Diceads Direct' },
    { value: 'bright-ads-co', label: 'BrightAds Co' },
    { value: 'technova-inc', label: 'TechNova Inc' },
    { value: 'metrofinance-group', label: 'MetroFinance Group' },
    { value: 'global-media-partners', label: 'Global Media Partners' },
  ];

  private readonly currencies: SelectOption[] = [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
  ];

  private readonly categories: SelectOption[] = [
    { value: 'loan-and-finance', label: 'Loan And Finance' },
    { value: 'vpn-and-security', label: 'VPN & Security' },
    { value: 'health-and-wellness', label: 'Health & Wellness' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'home-services', label: 'Home Services' },
    { value: 'education', label: 'Education' },
    { value: 'travel', label: 'Travel' },
  ];

  private readonly trafficTypes: string[] = [
    'Banner Display',
    'Brand Context AD',
    'ClickUnder/PopUnder',
    'Context AD',
    'Doorways',
    'FB',
    'Google Mail Marketing',
    'Incent Traffic',
    'Instagram',
    'Mobile Traffic',
    'Native',
    'Network',
    'Social Networking: Targeted AD',
    'Teaser/Banner AD',
    'Text/Links',
    'Video',
    'Web Sites',
  ];

  @Public()
  @Query(() => CampaignOptions, { name: 'campaignOptions' })
  options(): CampaignOptions {
    return {
      partners: this.partners,
      currencies: this.currencies,
      categories: this.categories,
      trafficTypes: this.trafficTypes,
    };
  }
}
