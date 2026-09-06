import { Test, TestingModule } from '@nestjs/testing';
import { ClickService, ClickNotFoundError } from './click.service';
import { PrismaService } from 'database/prisma.service';

describe('ClickService', () => {
  let service: ClickService;

  const mockPrisma = {
    campaign: {
      findUnique: jest.fn(),
    },
    click: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ClickService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw ClickNotFoundError when campaign not found', async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue(null);
    await expect(
      service.record({
        campaignSlug: 'missing',
        ip: '1.2.3.4',
        userAgent: 'ua',
      }),
    ).rejects.toThrow(ClickNotFoundError);
  });

  it('should mark capBlocked=true when TOTAL cap limit is 0', async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'camp-1',
      status: 'ACTIVE',
      previewLink: 'https://example.com',
      endDate: new Date(Date.now() + 86400000),
      caps: [{ id: 'cap-1', capType: 'TOTAL', capLimit: 0 }],
    });
    mockPrisma.click.findFirst.mockResolvedValue(null);
    mockPrisma.click.create.mockResolvedValue({});

    const result = await service.record({
      campaignSlug: 'camp',
      ip: '1.2.3.4',
      userAgent: 'ua',
    });
    expect(result.capBlocked).toBe(true);
  });

  it('should mark capBlocked=false when no caps', async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'camp-1',
      status: 'ACTIVE',
      previewLink: 'https://example.com',
      endDate: new Date(Date.now() + 86400000),
      caps: [],
    });
    mockPrisma.click.findFirst.mockResolvedValue(null);
    mockPrisma.click.create.mockResolvedValue({});

    const result = await service.record({
      campaignSlug: 'camp',
      ip: '1.2.3.4',
      userAgent: 'ua',
    });
    expect(result.capBlocked).toBe(false);
  });
});
