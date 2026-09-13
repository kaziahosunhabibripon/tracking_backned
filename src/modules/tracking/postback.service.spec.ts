import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PostbackService } from './postback.service';
import { PrismaService } from 'database/prisma.service';
import { verifyHmacSha256 } from 'common/utils/hmac.util';

jest.mock('common/utils/hmac.util');

const mockedVerifyHmac = verifyHmacSha256 as jest.MockedFunction<
  typeof verifyHmacSha256
>;

describe('PostbackService', () => {
  let service: PostbackService;

  const mockPrisma = {
    click: {
      findUnique: jest.fn(),
    },
    conversion: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    campaignCap: {
      updateMany: jest.fn(),
    },
    advertiserPostbackLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    mockedVerifyHmac.mockReturnValue(true);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostbackService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'POSTBACK_SECRET') return 'secret';
              if (key === 'MAX_CLICK_AGE_HOURS') return 30 * 24;
              return undefined;
            },
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PostbackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should reject when HMAC is invalid', async () => {
    mockedVerifyHmac.mockReturnValue(false);
    const result = await service.ingest({
      campaignId: 'camp-1',
      rawBody: 'body',
      signature: 'sig',
      params: { click_id: 'click-1', txn_id: 'txn-1' },
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('should reject when txn_id is missing', async () => {
    const result = await service.ingest({
      campaignId: 'camp-1',
      rawBody: 'body',
      signature: 'sig',
      params: { click_id: 'click-1' },
    });
    expect(result).toEqual({ ok: false, reason: 'missing_txn_id' });
  });

  it('should reject when click_id is missing', async () => {
    const result = await service.ingest({
      campaignId: 'camp-1',
      rawBody: 'body',
      signature: 'sig',
      params: { txn_id: 'txn-1' },
    });
    expect(result).toEqual({ ok: false, reason: 'click_not_found' });
  });

  it('should reject when click not found', async () => {
    mockPrisma.click.findUnique.mockResolvedValue(null);
    const result = await service.ingest({
      campaignId: 'camp-1',
      rawBody: 'body',
      signature: 'sig',
      params: { click_id: 'click-1', txn_id: 'txn-1' },
    });
    expect(result).toEqual({ ok: false, reason: 'click_not_found' });
  });

  it('should reject when campaign mismatch', async () => {
    mockPrisma.click.findUnique.mockResolvedValue({
      id: 'click-1',
      campaignId: 'camp-other',
      capBlocked: false,
      createdAt: new Date(),
    });
    const result = await service.ingest({
      campaignId: 'camp-1',
      rawBody: 'body',
      signature: 'sig',
      params: { click_id: 'click-1', txn_id: 'txn-1' },
    });
    expect(result).toEqual({ ok: false, reason: 'campaign_mismatch' });
  });

  it('should reject when capBlocked is true', async () => {
    mockPrisma.click.findUnique.mockResolvedValue({
      id: 'click-1',
      campaignId: 'camp-1',
      capBlocked: true,
      createdAt: new Date(),
    });
    const result = await service.ingest({
      campaignId: 'camp-1',
      rawBody: 'body',
      signature: 'sig',
      params: { click_id: 'click-1', txn_id: 'txn-1' },
    });
    expect(result).toEqual({ ok: false, reason: 'cap_blocked' });
  });

  it('should reject when click is too old', async () => {
    mockPrisma.click.findUnique.mockResolvedValue({
      id: 'click-1',
      campaignId: 'camp-1',
      capBlocked: false,
      createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
    });
    const result = await service.ingest({
      campaignId: 'camp-1',
      rawBody: 'body',
      signature: 'sig',
      params: { click_id: 'click-1', txn_id: 'txn-1' },
    });
    expect(result).toEqual({ ok: false, reason: 'click_too_old' });
  });

  it('should deduplicate existing conversion by txn_id', async () => {
    mockPrisma.click.findUnique.mockResolvedValue({
      id: 'click-1',
      campaignId: 'camp-1',
      capBlocked: false,
      createdAt: new Date(),
    });
    mockPrisma.conversion.findUnique.mockResolvedValue({ id: 'conv-1' });

    const result = await service.ingest({
      campaignId: 'camp-1',
      rawBody: 'body',
      signature: 'sig',
      params: { click_id: 'click-1', txn_id: 'txn-1' },
    });
    expect(result).toEqual({
      ok: true,
      conversionId: 'conv-1',
      deduplicated: true,
    });
  });

  it('should create conversion and return ok=true when valid', async () => {
    mockPrisma.click.findUnique.mockResolvedValue({
      id: 'click-1',
      campaignId: 'camp-1',
      capBlocked: false,
      createdAt: new Date(),
    });
    mockPrisma.conversion.findUnique.mockResolvedValue(null);
    const tx = {
      conversion: { create: jest.fn(() => ({ id: 'conv-new' })) },
      campaignCap: { updateMany: jest.fn() },
      advertiserPostbackLog: { create: jest.fn() },
    };
    mockPrisma.$transaction.mockImplementation((cb: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
      return cb(tx);
    });

    const result = await service.ingest({
      campaignId: 'camp-1',
      rawBody: 'body',
      signature: 'sig',
      params: {
        click_id: 'click-1',
        txn_id: 'txn-1',
        revenue: '10',
        payout: '5',
      },
    });
    expect(result).toEqual({
      ok: true,
      conversionId: 'conv-new',
      deduplicated: false,
    });
    expect(tx.campaignCap.updateMany).toHaveBeenCalledWith({
      where: { campaignId: 'camp-1', capType: { not: 'TOTAL' } },
      data: { currentCount: { increment: 1 } },
    });
  });
});
