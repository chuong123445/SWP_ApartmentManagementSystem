package com.ancu.proptech.repository.apartment;

import com.ancu.proptech.model.apartment.Apartment;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ApartmentGroupRepository {
    private final EntityManager em;

    public record Group(Long propertyId,String name,String address,BigDecimal minRent,BigDecimal maxRent,
                        BigDecimal minArea,BigDecimal maxArea,long rooms,Long representativeApartmentId) {}
    public record Result(List<Group> groups,long total) {}

    public Result search(Specification<Apartment> filter,int page,int size) {
        var cb=em.getCriteriaBuilder();
        var query=cb.createTupleQuery();
        var root=query.from(Apartment.class);
        var property=root.get("property");
        query.multiselect(property.get("id"),property.get("name"),property.get("address"),
                cb.min(root.<BigDecimal>get("advertisedMonthlyRent")),cb.max(root.<BigDecimal>get("advertisedMonthlyRent")),
                cb.min(root.<BigDecimal>get("areaM2")),cb.max(root.<BigDecimal>get("areaM2")),cb.countDistinct(root.get("id")),
                cb.min(root.<Long>get("id")));
        query.where(filter.toPredicate(root,query,cb));
        query.groupBy(property.get("id"),property.get("name"),property.get("address"));
        query.orderBy(cb.asc(property.get("id")));
        var groups=em.createQuery(query).setFirstResult(Math.multiplyExact(page,size)).setMaxResults(size)
                .getResultList().stream().map(this::group).toList();
        var covers=representativesWithImages(filter,groups.stream().map(Group::propertyId).toList());
        groups=groups.stream().map(group->new Group(group.propertyId(),group.name(),group.address(),
            group.minRent(),group.maxRent(),group.minArea(),group.maxArea(),group.rooms(),
            covers.getOrDefault(group.propertyId(),group.representativeApartmentId()))).toList();

        var count=cb.createQuery(Long.class);
        var countRoot=count.from(Apartment.class);
        count.select(cb.countDistinct(countRoot.get("property").get("id")));
        count.where(filter.toPredicate(countRoot,count,cb));
        return new Result(groups,em.createQuery(count).getSingleResult());
    }

    private Map<Long,Long> representativesWithImages(Specification<Apartment> filter,List<Long> propertyIds) {
        if(propertyIds.isEmpty())return Map.of();
        var cb=em.getCriteriaBuilder();
        var query=cb.createTupleQuery();
        var root=query.from(Apartment.class);
        var photos=query.subquery(Long.class);
        var photo=photos.from(com.ancu.proptech.model.property.PropertyImage.class);
        photos.select(photo.get("id")).where(cb.equal(photo.get("apartmentId"),root.get("id")),
            cb.equal(photo.get("propertyId"),root.get("property").get("id")));
        var legacyCover=root.<String>get("coverImagePath");
        var hasCover=cb.and(cb.isNotNull(legacyCover),cb.notEqual(cb.trim(legacyCover),""),
            cb.notEqual(legacyCover,"/images/apartment-placeholder.svg"));
        query.multiselect(root.get("property").get("id"),cb.min(root.<Long>get("id")));
        query.where(filter.toPredicate(root,query,cb),root.get("property").get("id").in(propertyIds),
            cb.or(hasCover,cb.exists(photos)));
        query.groupBy(root.get("property").get("id"));
        return em.createQuery(query).getResultList().stream()
            .collect(Collectors.toMap(row->row.get(0,Long.class),row->row.get(1,Long.class)));
    }

    private Group group(Tuple row) {
        return new Group(row.get(0,Long.class),row.get(1,String.class),row.get(2,String.class),
                row.get(3,BigDecimal.class),row.get(4,BigDecimal.class),row.get(5,BigDecimal.class),
                row.get(6,BigDecimal.class),row.get(7,Long.class),row.get(8,Long.class));
    }
}
