package com.ancu.proptech.controller.auth;

import com.ancu.proptech.config.auth.VneidProperties;
import com.ancu.proptech.dto.auth.*;
import com.ancu.proptech.service.auth.*;
import org.junit.jupiter.api.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.method.support.*;
import org.springframework.core.MethodParameter;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.bind.support.WebDataBinderFactory;
import java.time.Instant;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** HTTP/validation contract only. Security-filter and SQL tests are separate. */
class VneidConfirmationControllerTests {
    VneidService service; MockMvc mvc;
    AuthUserResponse user=new AuthUserResponse(1L,"test@example.invalid","Display",List.of("CUSTOMER"),"ACTIVE","VERIFIED",1);
    @BeforeEach void setup() {
        service=mock(VneidService.class);
        var controller=new AuthController(mock(AuthService.class),mock(GoogleLoginService.class),mock(RegistrationService.class),
                service,mock(OwnerUpgradeService.class),new VneidProperties(),mock(CookieCsrfTokenRepository.class));
        var jwt=Jwt.withTokenValue("test").header("alg","HS256").subject("1").claim("sid","1").build();
        mvc=MockMvcBuilders.standaloneSetup(controller).setCustomArgumentResolvers(new HandlerMethodArgumentResolver(){
            public boolean supportsParameter(MethodParameter p){return p.getParameterType()==Jwt.class;}
            public Object resolveArgument(MethodParameter p,ModelAndViewContainer c,NativeWebRequest r,WebDataBinderFactory b){return jwt;}
        }).build();
    }
    @Test void mismatchReturns202NoStoreWithoutVerifiedUserOrPrivateDocument() throws Exception {
        when(service.verifySelf(any(),eq("external"))).thenReturn(new VneidService.LinkAttempt(null,
                new VneidNameConfirmation("CONFIRMATION_REQUIRED","opaque","Display","Legal",Instant.now().plusSeconds(60))));
        mvc.perform(post("/api/v1/me/verifications/vneid").contentType("application/json").content("{\"auth0AccessToken\":\"external\"}"))
            .andExpect(status().isAccepted()).andExpect(header().string("Cache-Control","no-store"))
            .andExpect(jsonPath("$.legalName").value("Legal")).andExpect(jsonPath("$.confirmationId").value("opaque"))
            .andExpect(jsonPath("$.roles").doesNotExist()).andExpect(jsonPath("$.documentNumber").doesNotExist());
    }
    @Test void matchingFlowKeepsExisting200Contract() throws Exception {
        when(service.verifySelf(any(),eq("external"))).thenReturn(new VneidService.LinkAttempt(user,null));
        mvc.perform(post("/api/v1/me/verifications/vneid").contentType("application/json").content("{\"auth0AccessToken\":\"external\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.contactVerificationStatus").value("VERIFIED"));
    }
    @Test void confirmAcceptsOpaqueIdAndReturnsUser() throws Exception {
        when(service.confirmSelf(any(),eq("opaque"))).thenReturn(user);
        mvc.perform(post("/api/v1/me/verifications/vneid/confirm").contentType("application/json").content("{\"confirmationId\":\"opaque\"}"))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));
        verify(service).confirmSelf(any(),eq("opaque"));
    }
    @Test void cancelReturnsNoContentWithoutUserActivation() throws Exception {
        mvc.perform(post("/api/v1/me/verifications/vneid/cancel").contentType("application/json").content("{\"confirmationId\":\"opaque\"}"))
            .andExpect(status().isNoContent()).andExpect(header().string("Cache-Control","no-store"));
        verify(service).cancelSelf(any(),eq("opaque"));verify(service,never()).confirmSelf(any(),any());
    }
    @Test void forgedCitizenFieldsAndEmptyConfirmationAreRejectedBeforeService() throws Exception {
        for(String body:List.of("{\"confirmationId\":\"\"}","{\"confirmationId\":\"opaque\",\"legalName\":\"Forged\"}"))
            mvc.perform(post("/api/v1/me/verifications/vneid/confirm").contentType("application/json").content(body)).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
