import { Cache, LocalStorage, getPreferenceValues } from "@raycast/api";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

interface TokenAuthResponse {
  tokenAuth: {
    token: string;
    payload: Record<string, unknown>;
    refreshExpiresIn: number;
  };
}

export interface Vehicle {
  id: string;
  pk: number;
  label: string;
  brand: string;
  model: string;
  licensePlate: string;
  address: string;
  city: string;
  zip: string;
  timezone: string;
  captions: Array<string | null>;
  capabilities: Array<string | null>;
  condition: string;
  customText: string;
  description: string;
  onBoardUnit: string;
  thumbnail?: string | null;
  carsharinggroup: {
    name: string;
  };
  data: {
    electricVehicleData?: {
      dateTime: string;
      displayRecommendation: boolean;
      charging?: boolean | null;
      pluggedIn?: boolean | null;
      stateOfCharge?: {
        value?: number | null;
        zone?: string | null;
      } | null;
    } | null;
    floatingPosition?: {
      address?: string | null;
      displayRecommendation: boolean;
      point: {
        latitude: number;
        longitude: number;
      };
    } | null;
    fuelLevelData?: {
      displayRecommendation: boolean;
      fuelLevel?: {
        value?: number | null;
      } | null;
    } | null;
  };
  homebase: {
    latitude: number;
    longitude: number;
  };
  instantAvailability: {
    usableNow: boolean;
  };
  reservations: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
    edges: Array<{
      node: {
        id: string;
        start: string;
        end: string;
        bufferedEnd: string;
        addedBy: {
          id: string;
          pk: number;
        };
      };
    }>;
  };
  supporters: Array<{
    email: string | null;
    fullName?: string | null;
    phoneNumber?: string | null;
    phoneNumberMobile?: string | null;
    pk: number;
  } | null>;
  zoneObject?: {
    label: string;
    jsonData?: unknown;
  } | null;
}

interface VehiclesResponse {
  allVehicles: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    edges: Array<{
      cursor: string;
      node: Vehicle;
    }>;
  };
}

export interface Reservation {
  id: string;
  start: string;
  end: string;
  vehicle: {
    id: string;
    label?: string | null;
    brand?: string | null;
    model?: string | null;
    licensePlate?: string | null;
    address?: string | null;
    city?: string | null;
    zip?: string | null;
    thumbnail?: string | null;
    captions: string[];
    timezone: string;
    capabilities: string[];
  };
  state: string;
  fishingPin?: string;
  note?: string | null;
  purpose: string;
}

interface ReservationsResponse {
  allReservations: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    edges: Array<{
      cursor: string;
      node: Reservation;
    }>;
  };
}

interface BookingInput {
  vehicleId: string;
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
  purpose: string;
  note?: string;
}

interface ReservationResult {
  id: string;
  start: string;
  end: string;
  state: string;
  note?: string;
  vehicle: {
    id: string;
    label: string;
    licensePlate: string;
  };
}

interface UserError {
  field: string;
  messages: string[];
}

interface BookingResponse {
  createReservation: {
    reservation: ReservationResult | null;
    userErrors: UserError[] | null;
  };
}

interface UpdateReservationResponse {
  updateReservation: {
    reservation: ReservationResult | null;
    userErrors: UserError[] | null;
  };
}

interface DeleteReservationResponse {
  deleteReservation: {
    reservation: { id: string } | null;
    userErrors: UserError[] | null;
  };
}

// JWT token: kept in memory and in Raycast's encrypted LocalStorage until it expires,
// so a new command launch doesn't have to log in again
let jwtToken: string | null = null;
let pendingAuth: Promise<void> | null = null;

const TOKEN_STORAGE_KEY = "zemtu_jwt";

// Earlier versions kept the token in the unencrypted cache
new Cache().remove(TOKEN_STORAGE_KEY);

// Above this many free vehicles a single page can't tell whether a specific one is among them
const AVAILABILITY_PAGE_SIZE = 100;

interface CachedToken {
  token: string;
  expiresAt: number; // ms since epoch
  account: string;
}

// Mutations report problems in userErrors next to the data, not in the top-level errors
const responseMessages = (response: GraphQLResponse<unknown>) => [
  ...(response.errors ?? []).map((error) => error.message),
  ...Object.values((response.data ?? {}) as Record<string, { userErrors?: UserError[] | null } | null>).flatMap(
    (payload) => payload?.userErrors?.flatMap((error) => error.messages) ?? [],
  ),
];

const formatUserErrors = (userErrors: UserError[]) => userErrors.map((error) => error.messages.join(", ")).join("; ");

// Server errors that mean the token is missing, invalid or expired
const isAuthError = (message: string) =>
  /signature|expired|authenticat|credentials|not logged|jwt|token|permission|401/i.test(message);

class ZemtuGraphQLClient {
  private baseUrl: string;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    // Use baseUrl from preferences, fallback to demo URL
    this.baseUrl = (preferences.baseUrl?.trim() || "https://demo.zemtu.com").replace(/\/+$/, "");
  }

  private static DELETE_RESERVATION_MUTATION = `
    mutation DeleteReservation($input: DeleteReservationInput!) {
      deleteReservation(input: $input) {
        clientMutationId
        reservation {
          id
        }
        userErrors {
          field
          messages
        }
      }
    }
  `;

  private async makeGraphQLRequest<T>(
    query: string,
    variables: Record<string, unknown> = {},
    requireAuth: boolean = true,
  ): Promise<GraphQLResponse<T>> {
    const url = `${this.baseUrl}/graphql`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add JWT token if available and required
    if (requireAuth && jwtToken) {
      headers["Authorization"] = `JWT ${jwtToken}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}. Response: ${responseText}`);
      }

      const jsonResponse = await response.json();
      return jsonResponse as GraphQLResponse<T>;
    } catch (error) {
      console.error("GraphQL request error:", error);
      throw error;
    }
  }

  private account(): string {
    return `${this.baseUrl}|${getPreferenceValues<Preferences>().username}`;
  }

  // Expiry (seconds since epoch) from the JWT itself, so it doesn't matter how the server formats `payload`
  private static tokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
      const exp = Number(payload.exp);
      return Number.isFinite(exp) ? exp : null;
    } catch {
      return null;
    }
  }

  private async persistToken(token: string) {
    const exp = ZemtuGraphQLClient.tokenExpiry(token);
    if (!exp) return;
    const stored: CachedToken = { token, expiresAt: exp * 1000, account: this.account() };
    await LocalStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(stored));
  }

  private async loadPersistedToken(): Promise<string | null> {
    try {
      const raw = await LocalStorage.getItem<string>(TOKEN_STORAGE_KEY);
      if (!raw) return null;
      const cached: CachedToken = JSON.parse(raw);
      // Keep a minute of headroom so the token doesn't expire mid-request
      if (cached.account !== this.account() || cached.expiresAt - 60_000 < Date.now()) return null;
      return cached.token;
    } catch {
      return null;
    }
  }

  // Runs an authenticated request; logs in again once if the server rejects the token
  private async authorizedRequest<T>(query: string, variables: Record<string, unknown> = {}) {
    await this.ensureAuthenticated();
    try {
      const response = await this.makeGraphQLRequest<T>(query, variables);
      if (!isAuthError(responseMessages(response).join(" "))) return response;
    } catch (error) {
      // Only a real auth status: error pages can contain words like "token", and resending could book twice
      if (!(error instanceof Error) || !/request failed: 40[13]/i.test(error.message)) throw error;
    }

    await this.clearToken();
    await this.ensureAuthenticated();
    return this.makeGraphQLRequest<T>(query, variables);
  }

  async authenticate(): Promise<boolean> {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.username || !preferences.password) {
      throw new Error("Username and password are required for authentication");
    }

    // Use only the tokenAuth mutation that works with Zemtu
    const query = `
      mutation tokenAuth($input: ObtainJSONWebTokenInput!) {
        tokenAuth(input: $input) {
          token
          payload
          refreshExpiresIn
        }
      }
    `;

    try {
      const response = await this.makeGraphQLRequest<TokenAuthResponse>(
        query,
        {
          input: {
            username: preferences.username,
            password: preferences.password,
          },
        },
        false, // Don't require auth for authentication request
      );

      if (response.errors) {
        console.error("Authentication errors:", response.errors);
        throw new Error(response.errors[0]?.message || "Authentication failed");
      }

      if (response.data?.tokenAuth?.token) {
        jwtToken = response.data.tokenAuth.token;
        await this.persistToken(jwtToken);
        return true;
      }

      throw new Error("No token received from tokenAuth");
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }
  }

  // With `availability`, the server only returns vehicles that are free for the whole timespan
  async getVehicles(limit: number = 25, availability?: { start: string; end: string }): Promise<Vehicle[]> {
    const query = `
      query VehicleListView($first: Int${availability ? ", $availability: AvailabilityInput" : ""}) {
        allVehicles(first: $first${availability ? ", availability: $availability" : ""}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            cursor
            node {
              id
              pk
              label
              brand
              model
              licensePlate
              address
              city
              zip
              timezone
              captions
              capabilities
              condition
              customText
              description
              onBoardUnit
              thumbnail
              carsharinggroup {
                name
              }
              data {
                electricVehicleData {
                  dateTime
                  displayRecommendation
                  charging
                  pluggedIn
                  stateOfCharge {
                    value
                    zone
                  }
                }
                floatingPosition {
                  address
                  displayRecommendation
                  point {
                    latitude
                    longitude
                  }
                }
                fuelLevelData {
                  displayRecommendation
                  fuelLevel {
                    value
                  }
                }
              }
              homebase {
                latitude
                longitude
              }
              instantAvailability {
                usableNow
              }
              reservations(first: 10) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  node {
                    id
                    start
                    end
                    bufferedEnd
                    addedBy {
                      id
                      pk
                    }
                  }
                }
              }
              supporters {
                email
                fullName
                phoneNumber
                phoneNumberMobile
                pk
              }
              zoneObject {
                label
                jsonData
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.authorizedRequest<VehiclesResponse>(query, {
        first: limit,
        ...(availability ? { availability: { ...availability, availableDuringRequestedTimespan: true } } : {}),
      });

      if (response.errors) {
        console.error("GraphQL errors:", response.errors);
        throw new Error(response.errors[0]?.message || "Failed to fetch vehicles");
      }

      if (response.data?.allVehicles?.edges) {
        return response.data.allVehicles.edges.map((edge) => edge.node);
      }

      return [];
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      throw error;
    }
  }

  // Asks the server, which knows every reservation and buffer time
  async isVehicleFree(vehicleId: string, start: string, end: string): Promise<boolean> {
    const query = `
      query VehicleAvailability($first: Int, $availability: AvailabilityInput) {
        allVehicles(first: $first, availability: $availability) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;
    const response = await this.authorizedRequest<{ allVehicles: { edges: Array<{ node: { id: string } }> } | null }>(
      query,
      { first: AVAILABILITY_PAGE_SIZE, availability: { start, end, availableDuringRequestedTimespan: true } },
    );
    if (response.errors) throw new Error(response.errors[0]?.message || "Failed to check availability");

    const free = (response.data?.allVehicles?.edges ?? []).map((edge) => edge.node);
    // On a full page the vehicle may be further back; the server still rejects a conflicting booking
    return free.length >= AVAILABILITY_PAGE_SIZE || free.some((vehicle) => vehicle.id === vehicleId);
  }

  async getReservations(): Promise<Reservation[]> {
    const query = `
      query getReservations($first: Int!) {
        allReservations(
          first: $first
          isUnexpiredOnly: true
          isCurrentUserOnly: true
          state: [OPENED, PROTECTED]
          orderBy: "start"
        ) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            cursor
            node {
              id
              start
              end
              vehicle {
                id
                label
                brand
                model
                licensePlate
                address
                city
                zip
                thumbnail
                captions
                timezone
                capabilities
              }
              state
              fishingPin
              note
              purpose
            }
          }
        }
      }
    `;

    try {
      const response = await this.authorizedRequest<ReservationsResponse>(query, {
        first: 50, // Fetch up to 50 reservations
      });

      if (response.errors) {
        console.error("GraphQL errors:", response.errors);
        throw new Error(response.errors[0]?.message || "Failed to fetch reservations");
      }

      if (response.data?.allReservations?.edges) {
        return response.data.allReservations.edges.map((edge) => edge.node);
      }

      return [];
    } catch (error) {
      console.error("Error fetching reservations:", error);
      throw error;
    }
  }

  async createBooking(bookingData: BookingInput): Promise<ReservationResult> {
    const mutation = `
      mutation CreateReservation($input: CreateReservationInput!) {
        createReservation(input: $input) {
          reservation {
            id
            start
            end
            state
            note
            vehicle {
              id
              label
              licensePlate
            }
          }
          userErrors {
            field
            messages
          }
        }
      }
    `;

    const variables = {
      input: {
        reservation: {
          vehicleId: bookingData.vehicleId,
          start: bookingData.startTime,
          end: bookingData.endTime,
          note: bookingData.note || "",
          purpose: bookingData.purpose,
          liftOffer: false, // This is a required field
        },
      },
    };

    try {
      const response = await this.authorizedRequest<BookingResponse>(mutation, variables);

      if (response.errors) {
        console.error("Booking creation errors:", response.errors);
        throw new Error(response.errors[0]?.message || "Failed to create booking");
      }

      const userErrors = response.data?.createReservation?.userErrors;
      if (userErrors && userErrors.length > 0) {
        throw new Error(formatUserErrors(userErrors));
      }

      if (!response.data?.createReservation?.reservation) {
        throw new Error("No reservation data returned from booking creation");
      }

      return response.data.createReservation.reservation;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  }

  async deleteReservation(reservationId: string): Promise<boolean> {
    const variables = {
      input: {
        reservation: {
          id: reservationId,
        },
        clientMutationId: "delete-reservation",
      },
    };

    try {
      const response = await this.authorizedRequest<DeleteReservationResponse>(
        ZemtuGraphQLClient.DELETE_RESERVATION_MUTATION,
        variables,
      );

      if (!response || !response.data || !response.data.deleteReservation) {
        throw new Error("Failed to delete reservation");
      }

      if (response.data.deleteReservation.userErrors && response.data.deleteReservation.userErrors.length > 0) {
        throw new Error(formatUserErrors(response.data.deleteReservation.userErrors));
      }

      if (!response.data.deleteReservation.reservation) {
        throw new Error("Failed to delete reservation");
      }

      return true;
    } catch (error) {
      console.error("Error deleting reservation:", error);
      throw error;
    }
  }

  async updateReservation(
    reservationId: string,
    bookingData: Omit<BookingInput, "vehicleId">,
  ): Promise<ReservationResult> {
    const mutation = `
      mutation UpdateReservation($input: UpdateReservationInput!) {
        updateReservation(input: $input) {
          reservation {
            id
            start
            end
            state
            note
            vehicle {
              id
              label
              licensePlate
            }
          }
          userErrors {
            field
            messages
          }
        }
      }
    `;

    const variables = {
      input: {
        reservation: {
          id: reservationId,
          start: bookingData.startTime,
          end: bookingData.endTime,
          note: bookingData.note || "",
          purpose: bookingData.purpose,
        },
      },
    };

    try {
      const response = await this.authorizedRequest<UpdateReservationResponse>(mutation, variables);

      if (response.errors) {
        console.error("Reservation update errors:", response.errors);
        throw new Error(response.errors[0]?.message || "Failed to update reservation");
      }

      if (response.data?.updateReservation?.userErrors && response.data.updateReservation.userErrors.length > 0) {
        throw new Error(formatUserErrors(response.data.updateReservation.userErrors));
      }

      if (!response.data?.updateReservation?.reservation) {
        throw new Error("No reservation data returned from update");
      }

      return response.data.updateReservation.reservation;
    } catch (error) {
      console.error("Error updating reservation:", error);
      throw error;
    }
  }

  // True if the URL answers like a Zemtu GraphQL API (no login needed); throws if it can't be reached
  async isZemtuServer(): Promise<boolean> {
    try {
      const response = await this.makeGraphQLRequest<{ __typename: string }>("{ __typename }", {}, false);
      return response.data?.__typename === "Query";
    } catch (error) {
      // Reachable, but not a GraphQL endpoint (e.g. 404 or an HTML page)
      if (error instanceof Error && /request failed: 4\d\d|JSON/i.test(error.message)) return false;
      throw error;
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Concurrent callers share a single login request
  async ensureAuthenticated(): Promise<void> {
    if (jwtToken) return;

    if (!pendingAuth) {
      pendingAuth = (async () => {
        jwtToken = await this.loadPersistedToken();
        if (!jwtToken) await this.authenticate();
      })().finally(() => {
        pendingAuth = null;
      });
    }
    await pendingAuth;
  }

  async clearToken(): Promise<void> {
    jwtToken = null;
    await LocalStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export const graphqlClient = new ZemtuGraphQLClient();
