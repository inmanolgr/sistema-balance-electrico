import { ReeDataMapper, MappedEntry } from './ree-data.mapper';
import { ReeApiResponse } from './ree-api.types';

describe('ReeDataMapper', () => {
  let mapper: ReeDataMapper;

  const mockResponse: ReeApiResponse = {
    data: {
      type: 'Balance eléctrico',
      id: 'bal',
      attributes: { title: 'Balance', 'last-update': '2024-01-01T00:00:00Z' },
      included: [
        {
          type: 'Nuclear',
          id: '1',
          groupId: 'No-Renovable',
          attributes: {
            title: 'Nuclear',
            type: 'distinct',
            color: '#464394',
            magnitude: 'GWh',
            values: [
              { value: 1234.5, percentage: 0.21, datetime: '2024-01-01T12:00:00.000Z' },
              { value: 1100.0, percentage: 0.19, datetime: '2024-01-02T12:00:00.000Z' },
            ],
          },
        },
        {
          type: 'Demanda en b.c.',
          id: '2',
          groupId: 'Demanda en b.c.',
          attributes: {
            title: 'Demanda en b.c.',
            type: 'distinct',
            magnitude: 'GWh',
            values: [
              { value: null as unknown as number, percentage: 0, datetime: '2024-01-01T12:00:00.000Z' },
              { value: 5000, percentage: 1.0, datetime: '2024-01-02T12:00:00.000Z' },
            ],
          },
        },
      ],
    },
    included: [],
  };

  beforeEach(() => {
    mapper = new ReeDataMapper();
  });

  describe('mapResponse', () => {
    it('flattens included sources into individual entry records', () => {
      const result = mapper.mapResponse(mockResponse, 'day');
      // 2 Nuclear + 1 valid Demanda (null filtered out)
      expect(result).toHaveLength(3);
    });

    it('filters out null values from the response', () => {
      const result = mapper.mapResponse(mockResponse, 'day');
      const hasNull = result.some((e: MappedEntry) => e.value === null || e.value === undefined);
      expect(hasNull).toBe(false);
    });

    it('correctly maps source metadata', () => {
      const result = mapper.mapResponse(mockResponse, 'day');
      const nuclear = result.find((e: MappedEntry) => e.sourceTitle === 'Nuclear');
      expect(nuclear).toBeDefined();
      expect(nuclear!.sourceType).toBe('Nuclear');
      expect(nuclear!.sourceColor).toBe('#464394');
      expect(nuclear!.sourceMagnitude).toBe('GWh');
      expect(nuclear!.sourceGroupId).toBe('No-Renovable');
    });

    it('correctly parses datetime strings to Date objects', () => {
      const result = mapper.mapResponse(mockResponse, 'day');
      const nuclear = result.find((e: MappedEntry) => e.sourceTitle === 'Nuclear');
      expect(nuclear!.datetime).toBeInstanceOf(Date);
      expect(nuclear!.datetime.getFullYear()).toBe(2024);
    });

    it('correctly converts value to number', () => {
      const result = mapper.mapResponse(mockResponse, 'day');
      const nuclear = result.find((e: MappedEntry) => e.sourceTitle === 'Nuclear');
      expect(typeof nuclear!.value).toBe('number');
      expect(nuclear!.value).toBe(1234.5);
    });

    it('handles empty included array gracefully', () => {
      const emptyResponse: ReeApiResponse = {
        data: { ...mockResponse.data, included: [] },
        included: [],
      };
      const result = mapper.mapResponse(emptyResponse, 'day');
      expect(result).toHaveLength(0);
    });

    it('handles included items with empty values array', () => {
      const noValuesResponse: ReeApiResponse = {
        data: {
          ...mockResponse.data,
          included: [
            {
              type: 'Solar fotovoltaica',
              id: '3',
              groupId: 'Renovable',
              attributes: {
                title: 'Solar fotovoltaica',
                type: 'distinct',
                values: [],
              },
            },
          ],
        },
        included: [],
      };
      const result = mapper.mapResponse(noValuesResponse, 'day');
      expect(result).toHaveLength(0);
    });
  });

  describe('formatDate', () => {
    it('formats a date to REE API format YYYY-MM-DDTHH:mm', () => {
      const date = new Date('2024-03-15T08:30:00.000Z');
      const formatted = mapper.formatDate(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('pads single-digit months and days with zeros', () => {
      const date = new Date(2024, 0, 5, 9, 5); // Jan 5, 09:05 local
      const formatted = mapper.formatDate(date);
      expect(formatted).toContain('-01-05T');
    });
  });
});


