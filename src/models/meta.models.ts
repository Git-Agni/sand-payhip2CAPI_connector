export interface MetaUserData {
  readonly em: readonly string[];
  readonly client_ip_address: string;
}

export interface MetaContent {
  readonly id: string;
  readonly quantity: number;
  readonly title?: string;
}

export interface MetaCustomData {
  readonly currency: string;
  readonly value: number;
  readonly order_id: string;
  readonly content_type: "product";
  readonly content_ids: readonly string[];
  readonly contents: readonly MetaContent[];
}

export interface MetaPurchaseEvent {
  readonly event_name: "Purchase";
  readonly event_time: number;
  readonly event_id: string;
  readonly action_source: "website";
  readonly event_source_url?: string;
  readonly user_data: MetaUserData;
  readonly custom_data: MetaCustomData;
}

export interface MetaEventsRequest {
  readonly data: readonly MetaPurchaseEvent[];
  readonly test_event_code?: string;
}

export interface MetaEventsResponse {
  readonly events_received?: number;
  readonly messages?: readonly string[];
  readonly fbtrace_id?: string;
}
