export interface ReeApiValue {
  value: number;
  percentage: number;
  datetime: string;
}

export interface ReeIncludedAttributes {
  title: string;
  type: string;
  color?: string;
  magnitude?: string;
  composite?: boolean;
  'last-update'?: string;
  values: ReeApiValue[];
}

export interface ReeIncluded {
  type: string;
  id: string;
  groupId?: string;
  attributes: ReeIncludedAttributes;
}

export interface ReeApiResponse {
  data: {
    type: string;
    id: string;
    attributes: {
      title: string;
      'last-update': string;
      description?: string;
    };
    included?: ReeIncluded[];
  };
  included?: ReeIncluded[];
}

export interface ReeQueryParams {
  start_date: string;
  end_date: string;
  time_trunc: 'hour' | 'day' | 'month' | 'year';
}


