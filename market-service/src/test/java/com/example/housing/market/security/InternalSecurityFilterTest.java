package com.example.housing.market.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class InternalSecurityFilterTest {

    private final InternalSecurityFilter filter = new InternalSecurityFilter("test-bff-token", new ObjectMapper());

    @Test
    void rejectsMissingBffCredential() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/market/analysis");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("UNAUTHORIZED");
    }

    @Test
    void viewerCannotRunWhatIf() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/v1/market/what-if");
        request.addHeader("Authorization", "Bearer test-bff-token");
        request.addHeader("X-User-Role", "VIEWER");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("ANALYST role");
    }

    @Test
    void analystCanReachProtectedEndpoint() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/v1/market/what-if");
        request.addHeader("Authorization", "Bearer test-bff-token");
        request.addHeader("X-User-Role", "ANALYST");
        var response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
    }
}
