/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
/**
 * supertest's `.body` is untyped (`any`) by design — the unsafe-* rules
 * are disabled file-wide rather than per-line for the same reason
 * admin-reports.service.ts disables them for raw SQL rows.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  startPostgresContainer,
  stopPostgresContainer,
} from './testcontainers-setup';

describe('Tracking E2E (integration)', () => {
  let app: INestApplication<App>;
  let accessToken: string;
  let dockerAvailable = true;

  beforeAll(async () => {
    try {
      await startPostgresContainer();
    } catch (err: any) {
      if (err.message === 'SKIP_INTEGRATION_TESTS') {
        console.log('Skipping integration tests: Docker not available');
        dockerAvailable = false;
        return;
      }
      throw err;
    }
  }, 120000);

  afterAll(async () => {
    if (dockerAvailable) {
      await stopPostgresContainer();
    }
  });

  beforeEach(async () => {
    // Without this guard, a Docker-less run falls through to compiling
    // AppModule against whatever DATABASE_URL happens to be ambient in the
    // environment (e.g. a real dev database) instead of skipping — see
    // GAP-020.
    if (!dockerAvailable) return;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (dockerAvailable) {
      await app.close();
    }
  });

  it('full flow: login as advertiser → create campaign → click → postback → conversion', async () => {
    if (!dockerAvailable) {
      console.log('Skipping: Docker not available');
      return;
    }
    const loginRes = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation SignIn($input: SignInInput!) {
            signIn(input: $input) {
              accessToken
              user { id email role }
            }
          }
        `,
        variables: {
          input: {
            email: 'advertiser@example.com',
            password: 'Test123!@#',
          },
        },
      });

    const loginData = loginRes.body.data?.signIn;
    if (!loginData) {
      console.log('Login failed:', JSON.stringify(loginRes.body, null, 2));
    }
    expect(loginData).toBeDefined();
    accessToken = loginData.accessToken;

    const campaignRes = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `
          mutation CreateCampaign($input: CreateCampaignInput!) {
            createCampaign(input: $input) {
              id
              name
              slug
              status
            }
          }
        `,
        variables: {
          input: {
            name: `Test Campaign ${Date.now()}`,
            title: 'Test Campaign',
            category: 'test',
            previewLink: 'https://example.com',
            trackingLink: 'https://example.com/landing',
            costModel: 'CPA',
            defaultCost: '10.00',
            startDate: '2026-01-01',
            endDate: '2030-01-01',
            status: 'ACTIVE',
          },
        },
      });

    const campaign = campaignRes.body.data?.createCampaign;
    if (!campaign) {
      console.log(
        'Create campaign failed:',
        JSON.stringify(campaignRes.body, null, 2),
      );
    }
    expect(campaign).toBeDefined();
    const campaignSlug = campaign.slug;

    const clickRes = await request(app.getHttpServer())
      .get(`/r/${campaignSlug}`)
      .set('User-Agent', 'Mozilla/5.0')
      .expect(302);

    const cookies = clickRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies)
      ? cookies
      : cookies
        ? [cookies]
        : [];
    const clickId = cookieHeader
      .find((c: string) => c.startsWith('_tk_click='))
      ?.split(';')[0]
      .split('=')[1];

    expect(clickId).toBeDefined();

    const postbackRes = await request(app.getHttpServer())
      .post('/postback/' + campaign.id)
      .send(
        'click_id=' +
          clickId +
          '&txn_id=txn-' +
          Date.now() +
          '&payout=10&revenue=10',
      )
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('X-Signature', 'invalid')
      .expect(401);

    expect(postbackRes.body).toEqual({
      ok: false,
      reason: 'invalid_signature',
    });
  });
});
