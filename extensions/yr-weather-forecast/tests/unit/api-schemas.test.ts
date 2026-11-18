import {
  LocationForecastResponseSchema,
  LocationResultSchema,
  NominatimRawSearchResponseSchema,
  SunriseApiResponseSchema,
  TimeseriesEntrySchema,
} from "../../src/api-schemas";

describe("TimeseriesEntrySchema", () => {
  it("parses a valid timeseries entry", () => {
    const parsed = TimeseriesEntrySchema.parse({
      time: "2026-03-08T10:00:00Z",
      data: {
        instant: {
          details: {
            air_temperature: 12.5,
            wind_speed: 4.2,
            wind_from_direction: 190,
            cloud_area_fraction: 87,
          },
        },
        next_1_hours: {
          summary: { symbol_code: "cloudy" },
          details: { precipitation_amount: 0.2 },
        },
      },
    });

    expect(parsed.time).toBe("2026-03-08T10:00:00Z");
    expect(parsed.data.instant.details.air_temperature).toBe(12.5);
    expect(parsed.data.instant.details.cloud_area_fraction).toBe(87);
  });

  it("accepts non-numeric additive fields in instant.details", () => {
    const parsed = TimeseriesEntrySchema.parse({
      time: "2026-03-08T10:00:00Z",
      data: {
        instant: {
          details: {
            air_temperature: 12.5,
            some_future_string: "description",
            some_future_object: { nested: true },
          },
        },
      },
    });

    expect(parsed.data.instant.details.air_temperature).toBe(12.5);
  });

  it("rejects entries missing required root fields", () => {
    expect(() =>
      TimeseriesEntrySchema.parse({
        data: { instant: { details: {} } },
      }),
    ).toThrow();
  });
});

describe("LocationForecastResponseSchema", () => {
  it("allows additive fields and empty timeseries arrays", () => {
    const parsed = LocationForecastResponseSchema.parse({
      properties: {
        timeseries: [],
        some_new_api_field: "future-proof",
      },
      meta: {
        updated_at: "2026-03-08T10:00:00Z",
        producer: "met.no",
      },
      another_future_field: true,
    });

    expect(parsed.properties?.timeseries).toEqual([]);
    expect(parsed.meta?.updated_at).toBe("2026-03-08T10:00:00Z");
  });

  it("rejects invalid timeseries item shapes", () => {
    expect(() =>
      LocationForecastResponseSchema.parse({
        properties: {
          timeseries: [{ not: "a valid entry" }],
        },
      }),
    ).toThrow();
  });
});

describe("SunriseApiResponseSchema", () => {
  it("parses sunrise/sunset payload", () => {
    const parsed = SunriseApiResponseSchema.parse({
      properties: {
        sunrise: { time: "2026-03-08T06:40:00+01:00" },
        sunset: { time: "2026-03-08T18:11:00+01:00" },
      },
    });

    expect(parsed.properties?.sunrise?.time).toContain("06:40");
    expect(parsed.properties?.sunset?.time).toContain("18:11");
  });

  it("rejects non-string sunrise time", () => {
    expect(() =>
      SunriseApiResponseSchema.parse({
        properties: { sunrise: { time: 640 } },
      }),
    ).toThrow();
  });
});

describe("Nominatim and location schemas", () => {
  it("parses a valid nominatim search response", () => {
    const parsed = NominatimRawSearchResponseSchema.parse([
      {
        place_id: 123,
        display_name: "Oslo, Norway",
        lat: "59.9139",
        lon: "10.7522",
        address: { city: "Oslo", country: "Norway" },
      },
    ]);

    expect(parsed[0].display_name).toBe("Oslo, Norway");
    expect(parsed[0].lat).toBe("59.9139");
  });

  it("rejects nominatim items with invalid required fields", () => {
    expect(() =>
      NominatimRawSearchResponseSchema.parse([
        {
          place_id: {},
          display_name: "Oslo, Norway",
          lat: "59.9139",
          lon: "10.7522",
        },
      ]),
    ).toThrow();
  });

  it("rejects NaN coordinates in location result", () => {
    expect(() =>
      LocationResultSchema.parse({
        id: "456",
        displayName: "Bad Place",
        lat: NaN,
        lon: 10.0,
      }),
    ).toThrow();
  });

  it("accepts derived location result shape", () => {
    const parsed = LocationResultSchema.parse({
      id: "123",
      displayName: "Oslo, Norway",
      lat: 59.9139,
      lon: 10.7522,
      type: "city",
      new_field_from_transformer: "kept",
    });

    expect(parsed.id).toBe("123");
    expect(parsed.displayName).toBe("Oslo, Norway");
  });
});
