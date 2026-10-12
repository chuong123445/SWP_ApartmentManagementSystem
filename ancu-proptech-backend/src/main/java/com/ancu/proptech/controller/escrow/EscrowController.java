package com.ancu.proptech.controller.escrow;

import com.ancu.proptech.model.escrow.EscrowDeposit;
import com.ancu.proptech.service.escrow.EscrowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/trustguard/escrow")
@RequiredArgsConstructor
public class EscrowController {

    private final EscrowService escrowService;

    @GetMapping
    public ResponseEntity<List<EscrowDeposit>> getEscrows() {
        return ResponseEntity.ok(escrowService.getEscrows());
    }

    @PostMapping
    public ResponseEntity<EscrowDeposit> createEscrow(@RequestBody EscrowDeposit request) {
        return ResponseEntity.ok(escrowService.createEscrow(request));
    }

    @PostMapping("/{id}/release")
    public ResponseEntity<EscrowDeposit> releaseEscrow(@PathVariable String id) {
        return ResponseEntity.ok(escrowService.releaseEscrow(id));
    }
}
