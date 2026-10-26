package com.ancu.proptech.service.bootstrap;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.apartment.Apartment;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.repository.apartment.ApartmentRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
@Service @RequiredArgsConstructor
public class LocalBillingDataService {
    private final AuthAccountRepository accounts;private final PropertyRepository properties;
    private final ApartmentRepository apartments;private final RentalContractRepository contracts;private final PasswordEncoder passwords;
    // Explicitly authorized additive local fixtures; the original empty-catalog initializer is unchanged.
    @Transactional public synchronized void initialize(String ownerEmail,String emailOne,String passwordOne,String emailTwo,String passwordTwo){
        if(contracts.countByLocalFixtureTrue()>=2)return; // Account contact/password changes must not recreate fixtures.
        var owner=accounts.findByEmail(ownerEmail.toLowerCase(Locale.ROOT)).orElseThrow(()->new IllegalStateException("Configure the existing local Owner for billing fixtures."));
        if(owner.getRole()!=AuthAccount.Role.OWNER||owner.getStatus()!=AuthAccount.Status.ACTIVE||!owner.isContactVerified())throw new IllegalStateException("Local fixture Owner is not eligible; no account state was changed.");
        fixture(owner,emailOne,passwordOne,"Khách thuê Một","T.101","An Cư local - Xuân Hòa","TP. Hồ Chí Minh","Khu vực Quận 3","Phường Xuân Hòa",new BigDecimal("5000000"),new BigDecimal("1000"),new BigDecimal("200"));
        fixture(owner,emailTwo,passwordTwo,"Khách thuê Hai","T.102","An Cư local - Hải Châu","TP. Đà Nẵng","Khu vực Hải Châu","Phường Hải Châu",new BigDecimal("6500000"),new BigDecimal("800"),new BigDecimal("100"));
    }
    private void fixture(AuthAccount owner,String email,String password,String name,String number,String propertyName,String city,String district,String ward,BigDecimal rent,BigDecimal electric,BigDecimal water){
        var customer=accounts.findByEmail(email.toLowerCase(Locale.ROOT)).orElseGet(()->{
            if(password==null||password.length()<12)throw new IllegalStateException("Set local Tenant passwords (12+ characters) or disable APP_BILLING_FIXTURES.");
            AuthAccount u=new AuthAccount();u.setEmail(email.toLowerCase(Locale.ROOT));u.setFullName(name);u.setPasswordHash(passwords.encode(password));u.setRole(AuthAccount.Role.CUSTOMER);u.setStatus(AuthAccount.Status.ACTIVE);u.setContactVerified(true);u.setEmailVerified(true);return accounts.save(u);
        });
        if(customer.getRole()!=AuthAccount.Role.CUSTOMER||customer.getStatus()!=AuthAccount.Status.ACTIVE||!customer.isContactVerified())throw new IllegalStateException("Existing local Tenant account is not eligible; no account was overwritten.");
        if(contracts.existsByCustomerIdAndLocalFixtureTrue(customer.getId()))return;
        var property=properties.findByOwnerIdOrderByNameAscIdAsc(owner.getId()).stream().filter(p->p.getName().equals(propertyName)).findFirst().orElseGet(()->{
            Property p=new Property();p.setOwner(owner);p.setName(propertyName);p.setCity(city);p.setDistrict(district);p.setWard(ward);p.setAddress("Địa chỉ căn hộ mẫu local — "+ward+", "+city);p.setApprovalStatus(Property.ApprovalStatus.APPROVED);return properties.save(p);
        });
        var apartment=apartments.findByPropertyIdAndRoomNumber(property.getId(),number).orElseGet(()->{
            Apartment a=new Apartment();a.setProperty(property);a.setRoomNumber(number);a.setTitle("Căn hộ thuê local — "+number);a.setDescription("Căn hộ local có tài khoản thuê và hợp đồng mẫu để thử luồng hóa đơn.");a.setFloor(1);a.setAreaM2(new BigDecimal("35"));a.setAdvertisedMonthlyRent(rent);a.setElectricityIndex(electric.intValueExact());a.setWaterIndex(water.intValueExact());a.setMaxOccupants(2);a.setBedrooms(1);a.setBathrooms(1);a.setAmenities(new ArrayList<>(List.of("Máy lạnh","Bếp riêng")));a.setCoverImagePath(number.equals("T.101") ? "/apartment/images/apartment4.jpg" : "/apartment/images/department5.webp");a.setPublicationStatus(Apartment.PublicationStatus.PUBLISHED);a.setAvailability(Apartment.Availability.OCCUPIED);a.setCreatedAt(Instant.now());return apartments.save(a);
        });
        if(contracts.findByApartmentIdAndCustomerId(apartment.getId(),customer.getId()).isPresent())return;
        if(!contracts.findByApartmentId(apartment.getId()).isEmpty())throw new IllegalStateException("Fixture apartment already has another tenancy; no reassignment performed.");
        RentalContract c=new RentalContract();c.setApartment(apartment);c.setCustomer(customer);c.setStatus(RentalContract.Status.ACTIVE);c.setLocalFixture(true);
        LocalDate start=YearMonth.now().atDay(1);c.setStartDate(start);c.setEndDate(YearMonth.from(start).plusMonths(11).atEndOfMonth());c.setBaselineDate(start);
        c.setMonthlyRent(rent);c.setElectricityUnitPrice(new BigDecimal("3500"));c.setWaterUnitPrice(new BigDecimal("15000"));c.setElectricityBaseline(electric);c.setWaterBaseline(water);contracts.save(c);
    }
}
