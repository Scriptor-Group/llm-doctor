/**
 * Error Simulation Types
 */

export type ErrorSimulationType =
  | 'none'
  | 'safety_content_filter'
  | 'rate_limit'
  | 'model_overloaded'
  | 'timeout'
  | 'invalid_request'
  | 'authentication_error'
  | 'context_length_exceeded';

export interface ErrorConfig {
  type: ErrorSimulationType;
  httpStatus: number;
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
}

export const ERROR_CONFIGS: Record<ErrorSimulationType, ErrorConfig | null> = {
  none: null,

  safety_content_filter: {
    type: 'safety_content_filter',
    httpStatus: 400,
    errorCode: 'content_filter',
    message: 'The response was filtered due to the prompt triggering Azure OpenAI\'s content management policy. Please modify your prompt and retry.',
    details: {
      error_type: 'content_policy_violation',
      filter_result: {
        hate: { filtered: false, severity: 'safe' },
        self_harm: { filtered: false, severity: 'safe' },
        sexual: { filtered: false, severity: 'safe' },
        violence: { filtered: true, severity: 'high' }
      }
    }
  },

  rate_limit: {
    type: 'rate_limit',
    httpStatus: 429,
    errorCode: 'rate_limit_exceeded',
    message: 'Rate limit reached for requests. Please retry after a short wait.',
    details: {
      retry_after: 60,
      limit: '100 requests per minute'
    }
  },

  model_overloaded: {
    type: 'model_overloaded',
    httpStatus: 503,
    errorCode: 'model_overloaded',
    message: 'The model is currently overloaded with requests. Please try again later.',
    details: {
      model_status: 'overloaded',
      estimated_wait_time: '30 seconds'
    }
  },

  timeout: {
    type: 'timeout',
    httpStatus: 504,
    errorCode: 'timeout',
    message: 'The request timed out. The model took too long to respond.',
    details: {
      timeout_duration: '30s'
    }
  },

  invalid_request: {
    type: 'invalid_request',
    httpStatus: 400,
    errorCode: 'invalid_request_error',
    message: 'Invalid request: The model parameter is not supported or the messages format is incorrect.',
    details: {
      param: 'model',
      suggestion: 'Please check the API documentation for valid parameters.'
    }
  },

  authentication_error: {
    type: 'authentication_error',
    httpStatus: 401,
    errorCode: 'invalid_api_key',
    message: 'Incorrect API key provided. Please check your API key and try again.',
    details: {
      code: 'invalid_api_key'
    }
  },

  context_length_exceeded: {
    type: 'context_length_exceeded',
    httpStatus: 400,
    errorCode: 'context_length_exceeded',
    message: 'This model\'s maximum context length is 8192 tokens. However, your messages resulted in 10234 tokens.',
    details: {
      max_tokens: 8192,
      requested_tokens: 10234,
      suggestion: 'Please reduce the length of the messages.'
    }
  }
};
