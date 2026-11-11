package app.buildmaintain;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class LinksTest {
    private static final String LIVE = "https://buildinmaint.vercel.app";
    private static final String DEV = "http://localhost:3000";

    @Test public void ownSiteStaysInApp() {
        assertFalse(Links.isExternal("https://buildinmaint.vercel.app/admin/payments", LIVE));
        assertFalse(Links.isExternal("https://BuildInMaint.vercel.app/", LIVE));
        assertFalse(Links.isExternal("http://localhost:3000/login", DEV));
    }

    @Test public void otherSitesAndAppsGoOut() {
        assertTrue(Links.isExternal("https://wa.me/919800000000", LIVE));
        assertTrue(Links.isExternal("whatsapp://send?phone=919800000000", LIVE));
        assertTrue(Links.isExternal("tel:+919800000000", LIVE));
        assertTrue(Links.isExternal("mailto:a@b.c", LIVE));
        assertTrue(Links.isExternal("intent://send#Intent;scheme=whatsapp;end", LIVE));
        assertTrue(Links.isExternal("http://localhost:5000/", DEV));
    }

    @Test public void browserInternalsStay() {
        assertFalse(Links.isExternal("about:blank", LIVE));
        assertFalse(Links.isExternal("data:text/html,hi", LIVE));
        assertFalse(Links.isExternal("blob:https://buildinmaint.vercel.app/1234", LIVE));
        assertFalse(Links.isExternal("not a url", LIVE));
    }

    @Test public void homePagesLeaveTheApp() {
        assertTrue(Links.isHome("https://buildinmaint.vercel.app"));
        assertTrue(Links.isHome("https://buildinmaint.vercel.app/"));
        assertTrue(Links.isHome("http://localhost:3000/admin"));
        assertTrue(Links.isHome("http://localhost:3000/admin/?month=11"));
        assertTrue(Links.isHome("http://localhost:3000/member"));
        assertTrue(Links.isHome("http://localhost:3000/login"));
        assertFalse(Links.isHome("http://localhost:3000/admin/payments"));
        assertFalse(Links.isHome("http://localhost:3000/member/monthly-data"));
    }

    @Test public void backSkipsLoginAndOfflinePages() {
        assertTrue(Links.skipOnBack("data:text/html;charset=utf-8;base64,"));
        assertTrue(Links.skipOnBack("about:blank"));
        assertTrue(Links.skipOnBack("http://localhost:3000/login"));
        assertFalse(Links.skipOnBack("http://localhost:3000/admin/payments"));
        assertFalse(Links.skipOnBack("http://localhost:3000/admin"));
    }

    @Test public void nameFromContentDisposition() {
        assertEquals("Monthly Report Oct 2026.pdf",
            Links.fileName("https://h/api/x", "attachment; filename=\"Monthly Report Oct 2026.pdf\"", "application/pdf"));
        assertEquals("Dues Report.xlsx",
            Links.fileName("https://h/api/x", "attachment; filename*=UTF-8''Dues%20Report.xlsx", "application/octet-stream"));
    }

    @Test public void fallbackNamesGetAnExtension() {
        assertEquals("download.png", Links.fileName("blob:https://h/abc", null, "image/png"));
        assertEquals("monthly-report.pdf",
            Links.fileName("https://h/api/admin/export/monthly-report?month=10", "attachment", "application/pdf"));
        assertEquals("report.xlsx", Links.fileName("https://h/r/report", "",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    @Test public void unsafeCharactersReplaced() {
        assertEquals("a_b.pdf", Links.fileName("https://h/x", "attachment; filename=\"a/b.pdf\"", "application/pdf"));
    }
}
