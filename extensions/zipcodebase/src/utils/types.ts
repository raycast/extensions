type PostalCodeLocationInformation = {
  postal_code: string;
  country_code: string;
  latitude: string;
  longitude: string;
  city: string;
  state: string;
  city_en: string;
  state_en: string;
  state_code: string;
  province: string;
  province_code: string;
};
export type GetPostalCodeLocationInformationResponse = {
  query: {
    codes: string[];
    country: string;
  };
  results: {
    [key: string]: PostalCodeLocationInformation[];
  };
};

export type GetPostalCodeDistanceResponse = {
  query: {
    unit: string;
    code: string;
    country: string;
    compare: string[];
  };
  results: {
    [key: string]: number;
  };
};

type PostalCodeRadius = {
  code: string;
  city: string;
  state: string;
  city_en: string;
  state_en: string;
  distance: number;
};
export type GetPostalCodesWithinRadiusResponse = {
  query: {
    code: string;
    unit: string;
    radius: string;
    country: string;
  };
  results: PostalCodeRadius[];
};

type PostalCodeDistance = {
  code_1: string;
  code_2: string;
  distance: number;
};
export type GetPostalCodesWithinDistanceResponse = {
  query: {
    codes: string[];
    distance: string;
    unit: string;
    country: string;
  };
  results: PostalCodeDistance[];
};

export type GetPostalCodesByCityResponse = {
  query: {
    city: string;
    state: string;
    country: string;
  };
  results: string[];
};

export type GetPostalCodesByStateResponse = {
  query: {
    state: string;
    country: string;
  };
  results: string[];
};

export type GetStatesByCountryResponse = {
  query: {
    country: string;
  };
  results: string[];
};

export type GetRemainingRequestsResponse = {
  remaining_requests: string;
};

type SingleErrorResponse = {
  error: string;
};

type MultiErrorItem = {
  [key: string]: string;
};
type MultiErrorResponse = {
  errors: MultiErrorItem[];
};
export type ErrorResponse = SingleErrorResponse | MultiErrorResponse;
