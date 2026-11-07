package com.aion2buildlab

import org.junit.Assert.assertEquals
import org.junit.Test

class VersionComparisonTest {
    @Test
    fun comparesDifferentMajorVersions() {
        assertEquals(1, compareVersions("2.0.0", "1.9.9"))
        assertEquals(-1, compareVersions("1.0.0", "2.0.0"))
    }

    @Test
    fun comparesMinorAndPatchVersions() {
        assertEquals(1, compareVersions("1.2.0", "1.1.9"))
        assertEquals(1, compareVersions("1.2.1", "1.2.0"))
        assertEquals(-1, compareVersions("1.2.0", "1.2.1"))
    }

    @Test
    fun treatsMissingSegmentsAsZero() {
        assertEquals(0, compareVersions("1.2", "1.2.0"))
        assertEquals(0, compareVersions("1", "1.0.0"))
    }

    @Test
    fun treatsNonNumericSegmentsAsZero() {
        assertEquals(0, compareVersions("1.x.0", "1.0.0"))
    }

    @Test
    fun handlesVersionsWithDifferentLengths() {
        assertEquals(1, compareVersions("1.0.0.1", "1.0.0"))
    }
}
