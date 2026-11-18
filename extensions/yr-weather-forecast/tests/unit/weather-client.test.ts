import { getWeather, getWeatherWithMetadata } from "../../src/weather-client";
import { weatherApiClient } from "../../src/utils/api-client";

jest.mock("../../src/utils/api-client", () => ({
  weatherApiClient: {
    request: jest.fn(),
  },
}));

const mockedRequest = weatherApiClient.request as jest.Mock;

const firstEntry = {
  time: "2026-03-07T00:00:00Z",
  data: { instant: { details: { air_temperature: 4 } } },
};

describe("weather-client", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("derives current weather from the shared forecast cache path", async () => {
    mockedRequest.mockResolvedValue({
      data: [firstEntry],
      metadata: { updated_at: "2026-03-07T00:00:00Z" },
    });

    const result = await getWeatherWithMetadata(59.9139, 10.7522);

    expect(result).toEqual({
      data: firstEntry,
      metadata: { updated_at: "2026-03-07T00:00:00Z" },
    });
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(mockedRequest.mock.calls[0][1]).toMatch(/^forecast-meta:/);
  });

  it("returns the first forecast entry for current weather", async () => {
    mockedRequest.mockResolvedValue({
      data: [firstEntry],
      metadata: {},
    });

    await expect(getWeather(59.9139, 10.7522)).resolves.toBe(firstEntry);
  });
});
