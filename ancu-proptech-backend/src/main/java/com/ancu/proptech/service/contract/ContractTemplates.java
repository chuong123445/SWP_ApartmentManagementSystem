package com.ancu.proptech.service.contract;
import com.ancu.proptech.dto.contract.ContractClause;
import java.util.List;
/** Original editable drafting suggestions, not automated enforcement or a legal certification. */
public final class ContractTemplates {
    private ContractTemplates() {}
    public static List<ContractClause> apartment() { return List.of(
        new ContractClause("Bàn giao và quyền sử dụng căn hộ", "Bên A bàn giao căn hộ, thiết bị và chìa khóa theo biên bản hai bên xác nhận; bảo đảm Bên B sử dụng ổn định trong thời hạn thuê theo thỏa thuận."),
        new ContractClause("Sử dụng căn hộ và nội quy", "Bên B sử dụng căn hộ đúng mục đích đã ghi; giữ gìn tài sản, tuân thủ nội quy tòa nhà. Việc cho thuê lại hoặc cải tạo cần sự đồng ý bằng văn bản của Bên A."),
        new ContractClause("Tiền thuê và chi phí dịch vụ", "Tiền thuê, kỳ hạn và cách thanh toán theo phần điều kiện thuê. Điện, nước tính theo chỉ số thực tế và đơn giá đã thống nhất; các phí quản lý, internet, gửi xe phải được hai bên thỏa thuận rõ."),
        new ContractClause("Đặt cọc và hoàn trả", "Tiền cọc được đối chiếu khi kết thúc thuê và bàn giao lại căn hộ. Các khoản khấu trừ phải có căn cứ và được thông báo; hai bên thống nhất thời hạn hoàn trả phần còn lại bằng văn bản."),
        new ContractClause("Bảo trì, sửa chữa và thiệt hại", "Bên B báo kịp thời các hư hỏng. Bên A xử lý hư hỏng không do lỗi Bên B; thiệt hại do Bên B gây ra được xác định và bồi thường theo thỏa thuận, phân biệt với hao mòn thông thường."),
        new ContractClause("Gia hạn và chấm dứt thuê", "Gia hạn phải được hai bên thống nhất bằng văn bản. Khi đề nghị chấm dứt trước hạn, bên đề nghị thông báo bằng văn bản; thời gian báo trước, trách nhiệm bồi thường và đối chiếu công nợ do hai bên thỏa thuận."),
        new ContractClause("Rà soát và sửa đổi thỏa thuận", "Hai bên đọc và rà soát toàn bộ nội dung trước khi ký. Mọi sửa đổi điều kiện thuê được ghi nhận bằng văn bản có sự thống nhất của cả hai bên.")
    ); }
}
