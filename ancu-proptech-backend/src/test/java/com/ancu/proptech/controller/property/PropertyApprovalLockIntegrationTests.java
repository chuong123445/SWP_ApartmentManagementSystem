package com.ancu.proptech.controller.property;

import com.ancu.proptech.repository.property.PropertyDuplicateRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

// Deliberately no outer @Transactional: import begins its own fresh transaction
// after reading Auth0. An outer test transaction masks the first-statement bug.
@SpringBootTest @ActiveProfiles("test")
class PropertyApprovalLockIntegrationTests {
 @Autowired PropertyDuplicateRepository duplicates;
 @Autowired PlatformTransactionManager manager;
 @Autowired JdbcTemplate jdbc;
 @Test void firstBusinessStatementCanAcquireApprovalLock(){
  new TransactionTemplate(manager).executeWithoutResult(status->{
   assertEquals(0,jdbc.queryForObject("SELECT @@TRANCOUNT",Integer.class));
   assertTrue(duplicates.lockApproval(),"Fresh Auth0 import must not report REVIEW_BUSY without contention");
   assertEquals(1,jdbc.queryForObject("SELECT @@TRANCOUNT",Integer.class));
  });
  assertEquals(0,jdbc.queryForObject("SELECT @@TRANCOUNT",Integer.class));
 }
 @Test void rollbackReleasesLockAndDoesNotLeakNestedTransactions(){
  var tx=new TransactionTemplate(manager);
  tx.executeWithoutResult(status->{assertTrue(duplicates.lockApproval());assertEquals(1,jdbc.queryForObject("SELECT @@TRANCOUNT",Integer.class));status.setRollbackOnly();});
  assertEquals(0,jdbc.queryForObject("SELECT @@TRANCOUNT",Integer.class));
  tx.executeWithoutResult(status->assertTrue(duplicates.lockApproval()));
  assertEquals(0,jdbc.queryForObject("SELECT @@TRANCOUNT",Integer.class));
 }
 @Test @org.junit.jupiter.api.Timeout(20)
 void concurrentApprovalStillWaitsUntilFirstTransactionCommits()throws Exception{
  var held=new java.util.concurrent.CountDownLatch(1);var release=new java.util.concurrent.CountDownLatch(1);var waiting=new java.util.concurrent.CountDownLatch(1);
  var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
  try{
   var holder=pool.submit(()->new TransactionTemplate(manager).execute(status->{assertTrue(duplicates.lockApproval());held.countDown();try{assertTrue(release.await(5,java.util.concurrent.TimeUnit.SECONDS));}catch(InterruptedException e){Thread.currentThread().interrupt();throw new RuntimeException(e);}return true;}));
   assertTrue(held.await(5,java.util.concurrent.TimeUnit.SECONDS));
   var waiter=pool.submit(()->new TransactionTemplate(manager).execute(status->{waiting.countDown();return duplicates.lockApproval();}));
   assertTrue(waiting.await(5,java.util.concurrent.TimeUnit.SECONDS));
   assertThrows(java.util.concurrent.TimeoutException.class,()->waiter.get(300,java.util.concurrent.TimeUnit.MILLISECONDS));
   release.countDown();assertTrue(holder.get(5,java.util.concurrent.TimeUnit.SECONDS));assertTrue(waiter.get(5,java.util.concurrent.TimeUnit.SECONDS));
  }finally{release.countDown();pool.shutdownNow();}
 }
}
