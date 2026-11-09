package com.ancu.proptech.repository.apartment;

import com.ancu.proptech.model.apartment.Apartment;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class ApartmentGroupRepository {
    private final EntityManager em;

    public record Group(Long propertyId,String name,String address,BigDecimal minRent,BigDecimal maxRent,
                        BigDecimal minArea,BigDecimal maxArea,long rooms) {}
    public record Result(List<Group> groups,long total) {}

    public Result search(Specification<Apartment> filter,int page,int size) {
        var cb=em.getCriteriaBuilder();
        var query=cb.createTupleQuery();
        var root=query.from(Apartment.class);
        var property=root.get("property");
        query.multiselect(property.get("id"),property.get("name"),property.get("address"),
                cb.min(root.<BigDecimal>get("advertisedMonthlyRent")),cb.max(root.<BigDecimal>get("advertisedMonthlyRent")),
                cb.min(root.<BigDecimal>get("areaM2")),cb.max(root.<BigDecimal>get("areaM2")),cb.countDistinct(root.get("id")));
        query.where(filter.toPredicate(root,query,cb));
        query.groupBy(property.get("id"),property.get("name"),property.get("address"));
        query.orderBy(cb.asc(property.get("id")));
        var groups=em.createQuery(query).setFirstResult(Math.multiplyExact(page,size)).setMaxResults(size)
                .getResultList().stream().map(this::group).toList();

        var count=cb.createQuery(Long.class);
        var countRoot=count.from(Apartment.class);
        count.select(cb.countDistinct(countRoot.get("property").get("id")));
        count.where(filter.toPredicate(countRoot,count,cb));
        return new Result(groups,em.createQuery(count).getSingleResult());
    }

    private Group group(Tuple row) {
        return new Group(row.get(0,Long.class),row.get(1,String.class),row.get(2,String.class),
                row.get(3,BigDecimal.class),row.get(4,BigDecimal.class),row.get(5,BigDecimal.class),
                row.get(6,BigDecimal.class),row.get(7,Long.class));
    }
}
