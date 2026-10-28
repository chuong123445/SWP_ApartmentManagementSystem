package com.ancu.proptech.controller.property;
import com.ancu.proptech.service.property.PropertyRightNoticeService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.time.LocalDate;
import static org.mockito.Mockito.*;
@SpringBootTest(properties={"app.property-rights.scheduler-enabled=true","app.property-rights.initial-delay-ms=10","app.property-rights.interval-ms=60000","app.seed.enabled=false","app.billing.local-fixtures=false"})
@ActiveProfiles("test") @DirtiesContext(classMode=DirtiesContext.ClassMode.AFTER_CLASS)
class PropertyRightsSchedulingTests {
    @MockitoBean PropertyRightNoticeService notices;
    @Test void configuredSpringSchedulerActuallyInvokesNoticeGenerationAndDelivery(){verify(notices,timeout(5000)).generate(any(LocalDate.class));verify(notices,timeout(5000)).deliver();}
}
