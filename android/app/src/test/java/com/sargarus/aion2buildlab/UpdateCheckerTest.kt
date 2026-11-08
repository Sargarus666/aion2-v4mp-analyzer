package com.sargarus.aion2buildlab
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
class UpdateCheckerTest {
    @Test fun newerPatchIsDetected() { assertTrue(UpdateChecker.isNewer("v0.1.1", "0.1.0")) }
    @Test fun olderVersionIsRejected() { assertFalse(UpdateChecker.isNewer("0.9.9", "1.0.0")) }
    @Test fun equalVersionsAreNotNewer() { assertFalse(UpdateChecker.isNewer("v1.2.3", "1.2.3")) }
    @Test fun missingSegmentsAreZero() { assertFalse(UpdateChecker.isNewer("1.2", "1.2.0")) }
    @Test fun invalidSegmentsBecomeZero() { assertTrue(UpdateChecker.isNewer("1.2.beta", "1.1.9")) }
}
