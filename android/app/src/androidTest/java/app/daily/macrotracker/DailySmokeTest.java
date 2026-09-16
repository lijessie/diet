package app.daily.macrotracker;

import static org.junit.Assert.*;
import static androidx.test.espresso.intent.Intents.intending;
import static androidx.test.espresso.intent.matcher.IntentMatchers.hasAction;
import android.app.Activity;
import android.app.Instrumentation.ActivityResult;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.FileProvider;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.espresso.intent.Intents;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.io.File;
import java.nio.file.Files;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class DailySmokeTest {
    private String js(ActivityScenario<MainActivity> scenario, String expression) throws Exception {
        AtomicReference<String> value = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(expression, result -> {
            value.set(result);
            latch.countDown();
        }));
        assertTrue("WebView callback timed out", latch.await(10, TimeUnit.SECONDS));
        return value.get();
    }
    private void await(ActivityScenario<MainActivity> scenario, String expression) throws Exception {
        long deadline = System.currentTimeMillis() + 30000;
        do {
            if ("true".equals(js(scenario, expression))) return;
            Thread.sleep(200);
        } while (System.currentTimeMillis() < deadline);
        fail("Timed out: " + expression + "\n" + js(scenario, "document.body.innerText"));
    }
    private void click(ActivityScenario<MainActivity> scenario, String text) throws Exception {
        js(scenario, "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === " + JSONObject.quote(text) + ").click()");
    }
    @Test
    public void bundledAppPersistsWeightAndExportsBackup() throws Exception {
        Context context = ApplicationProvider.getApplicationContext();
        File backup = new File(context.getCacheDir(), "android-smoke-backup.json");
        Intents.init();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            await(scenario, "document.body.innerText.includes('Today’s balance')");
            js(scenario, "[...document.querySelectorAll('button')].find(b => b.textContent.includes('Body weight')).click()");
            await(scenario, "!!document.querySelector('dialog[open] input[type=number]')");
            js(scenario, "(() => { const input = document.querySelector('dialog input[type=number]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '80'); input.dispatchEvent(new Event('input', {bubbles:true})); })()");
            click(scenario, "Save weight");
            await(scenario, "document.body.innerText.includes('80 kg')");
            scenario.recreate();
            await(scenario, "document.body.innerText.includes('80 kg')");
            click(scenario, "Goals");
            click(scenario, "My data");
            Intent result = new Intent().setData(FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", backup));
            intending(hasAction(Intent.ACTION_CREATE_DOCUMENT)).respondWith(new ActivityResult(Activity.RESULT_OK, result));
            click(scenario, "Export backup");
            await(scenario, "document.body.innerText.includes('Backup exported.')");
            JSONObject data = new JSONObject(new String(Files.readAllBytes(backup.toPath()), java.nio.charset.StandardCharsets.UTF_8));
            assertEquals(1, data.getInt("version"));
            assertTrue(data.getJSONObject("weights").toString().contains("80"));
        } finally {
            Intents.release();
        }
    }
}
