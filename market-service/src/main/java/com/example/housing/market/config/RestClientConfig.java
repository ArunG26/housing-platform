package com.example.housing.market.config;

import com.example.housing.market.observability.TraceContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean
    RestClient mlRestClient(
            RestClient.Builder builder,
            @Value("${ml-service.base-url}") String baseUrl,
            @Value("${ml-service.token}") String token,
            @Value("${ml-service.connect-timeout-ms}") int connectTimeoutMs,
            @Value("${ml-service.read-timeout-ms}") int readTimeoutMs) {

        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeoutMs);
        requestFactory.setReadTimeout(readTimeoutMs);

        return builder
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .requestInterceptor((request, body, execution) -> {
                    request.getHeaders().set(HttpHeaders.AUTHORIZATION, "Bearer " + token);
                    request.getHeaders().set("X-Request-ID", TraceContext.currentRequestId());
                    request.getHeaders().set("traceparent", TraceContext.childTraceparent());
                    return execution.execute(request, body);
                })
                .build();
    }
}
