package com.chuyinzki.jesusvillegas3.imperialdaycare.activities;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.storage.StorageManager;
import android.util.Log;
import android.util.Pair;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.core.content.FileProvider;

import com.chuyinzki.jesusvillegas3.imperialdaycare.ChildDatabase;
import com.chuyinzki.jesusvillegas3.imperialdaycare.ProviderPreferences;
import com.chuyinzki.jesusvillegas3.imperialdaycare.Utils;
import com.chuyinzki.jesusvillegas3.imperialdaycare.objects.Child;
import com.chuyinzki.jesusvillegas3.imperialdaycare.objects.DayRecord;
import com.chuyinzki.jesusvillegas3.imperialdaycare.objects.Util;
import com.google.firebase.crashlytics.FirebaseCrashlytics;
import com.whiteelephant.monthpicker.MonthPickerDialog;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.DateFormatSymbols;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;

import static android.os.storage.StorageManager.ACTION_MANAGE_STORAGE;
import static android.util.TypedValue.COMPLEX_UNIT_SP;
import static com.chuyinzki.jesusvillegas3.imperialdaycare.activities.MainActivity.CHILD_EXTRA;
import static com.chuyinzki.jesusvillegas3.imperialdaycare.activities.MainActivity.RECORD_EXTRA;
import static com.chuyinzki.jesusvillegas3.imperialdaycare.objects.Util.allRecordsCompleteAndValid;
import static com.chuyinzki.jesusvillegas3.imperialdaycare.objects.Util.getAllAmPmHours;
import static com.chuyinzki.jesusvillegas3.imperialdaycare.objects.Util.getAmPmHours;
import static com.chuyinzki.jesusvillegas3.imperialdaycare.objects.Util.getRecordsForWeekNumber;
import static java.util.Calendar.SATURDAY;
import static java.util.Calendar.SUNDAY;

/**
 * Created by Jesus Villegas 3 on 11/8/2016.
 */

public class CheckinCheckoutActivity extends ParentMainActivity {

    @BindView(R.id.child_name)
    TextView childNameTV;
    @BindView(R.id.date)
    TextView dateTV;
    @BindView(R.id.child_times_lv)
    ListView childTimesLV;

    Child currentChild;
    DayRecordAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.checkin_checkout);
        ButterKnife.bind(this);

        Intent i = getIntent();
        currentChild = i.getParcelableExtra(CHILD_EXTRA);
        if (currentChild == null) {
            Toast.makeText(this, "Something went wrong...", Toast.LENGTH_SHORT).show();
            finish();
        }
        childNameTV.setText(currentChild.getFirstName() + " " + currentChild.getLastName());
        dateTV.setText(Util.getMonthDayYear("/"));
        adapter = new DayRecordAdapter(this, new ArrayList<DayRecord>());
        childTimesLV.setAdapter(adapter);

        childTimesLV.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> adapterView, View view, int i, long l) {
                Intent intent = new Intent(CheckinCheckoutActivity.this, RecordModifyActivity.class);
                intent.putExtra(CHILD_EXTRA, currentChild);
                intent.putExtra(RECORD_EXTRA, adapter.getItem(i));
                startActivity(intent);
            }
        });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.child_checkin_out, menu);
        return true;
    }

    //https://yangcha.github.io/iview/iview.html
    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.print) {
            //Do the printing stuff after the ad
            final Context context = CheckinCheckoutActivity.this;
            final CheckinCheckoutActivity activity = this;
            MonthPickerDialog.Builder builder = new MonthPickerDialog.Builder(context,
                    new MonthPickerDialog.OnDateSetListener() {
                        @Override
                        public void onDateSet(int selectedMonth, int selectedYear) {
                            List<DayRecord> records = ChildDatabase.getInstance(context)
                                    .getChildDayRecordsForMonth(currentChild, selectedMonth, selectedYear);

                            if(!allRecordsCompleteAndValid(records)) {
                                Toast.makeText(activity, "Not all records are valid, please fix records before printing.",
                                        Toast.LENGTH_LONG).show();
                                return;
                            }

                            if(records.isEmpty()) {
                                //TODO: Add record here so that it won't crash and then print anyways
//                                records.add(new DayRecord())
//                                toastLong("There are no records for the selected month. Printing anyways.");
                                Toast.makeText(activity, "There are no records for the selected month. Cannot print.", Toast.LENGTH_LONG).show();
                                return;
                            }

                            Handler mainHandler = new Handler(context.getMainLooper());
                            Runnable printRunnable = getPrintingRunnable(records, context, activity,
                                    selectedMonth, selectedYear);
                            mainHandler.post(printRunnable);
                        }
                    }, Calendar.getInstance().get(Calendar.YEAR), Calendar.getInstance().get(Calendar.MONTH));

            int activatedMonth = Calendar.getInstance().get(Calendar.MONTH) - 1;
            int activatedYear = Calendar.getInstance().get(Calendar.YEAR);
            if(activatedMonth < 0) {
                activatedMonth = Calendar.DECEMBER;
                activatedYear -= 1;
            }

            builder.setActivatedMonth(Calendar.JULY)
                    .setMinYear(1990)
                    .setActivatedYear(activatedYear)
                    .setActivatedMonth(activatedMonth)
                    .setMaxYear(Calendar.getInstance().get(Calendar.YEAR))
                    .setTitle("Select month")
                    .setOnMonthChangedListener(new MonthPickerDialog.OnMonthChangedListener() {
                        @Override
                        public void onMonthChanged(int selectedMonth) {

                        }
                    })
                    .setOnYearChangedListener(new MonthPickerDialog.OnYearChangedListener() {
                        @Override
                        public void onYearChanged(int selectedYear) {

                        }
                    })
                    .build()
                    .show();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private Runnable getPrintingRunnable(List<DayRecord> records, Context context, Activity activity,
                                         int selectedMonth, int selectedYear) {
        return () -> {
            Util.fillOutEmptyRecords(records);

            //TODO: Improve logic. Some of this might be redo work wasting time.
            //////////////////////// Make First File ////////////////////////
            Bitmap src = Bitmap.createScaledBitmap(BitmapFactory.decodeResource(getResources(), R.drawable.daycare_provider_sheet),
                    1608, 1243, false);
            Bitmap dest = Bitmap.createBitmap(src.getWidth(), src.getHeight(), Bitmap.Config.ARGB_8888);
            final int mainTextSize = 33;
            final int lineTextSize = 18;
            final int dobTextSize = 28;

            Canvas cs = new Canvas(dest);
            Paint tPaint = new Paint();
            tPaint.setTextSize(mainTextSize);
            tPaint.setColor(Color.BLUE);
            tPaint.setStyle(Paint.Style.FILL);
            cs.drawBitmap(src, 0f, 0f, null);

            ProviderPreferences.Preferences providerInfo = ProviderPreferences.getProviderInfo(context);
            int providerY = 243;
            assert providerInfo != null;
            cs.drawText(providerInfo.name, 154, providerY, tPaint);
            cs.drawText(providerInfo.key, 1414, providerY, tPaint);
            if(providerInfo.altId != null)
                cs.drawText(providerInfo.altId, 1052, 243, tPaint);

            int parentY = 134;
            cs.drawText(currentChild.getParentName(), 290, parentY, tPaint);
            tPaint.setTextSize(lineTextSize);
            cs.drawText(currentChild.getFamId(), 139, parentY, tPaint);
            cs.drawText(currentChild.getTechNumber(), 1419, parentY, tPaint);
            tPaint.setTextSize(mainTextSize);
            // Seems case number was removed in the updated sheet
            //cs.drawText(currentChild.getCaseNumber(), 1020, parentY, tPaint);

            int childNameY = 176;
            String childFullName = currentChild.getFirstName() + " " + currentChild.getLastName();
            cs.drawText(childFullName, 282, childNameY, tPaint);
            String age = Util.getAge(currentChild.getDob());
            String ageWithYears = age + (age.equals("1") ? " year" : " years");
            cs.drawText(ageWithYears, 866, childNameY, tPaint);

            tPaint.setTextSize(lineTextSize);
            cs.drawText(currentChild.getChildId(), 139, childNameY, tPaint);
            tPaint.setTextSize(dobTextSize);
            SimpleDateFormat sdf = new SimpleDateFormat("MM/dd/yyyy", Locale.getDefault());
            cs.drawText(sdf.format(currentChild.getDob()), 1052, childNameY, tPaint);

            int topY = 694;
            int ySpacing = 50;
            int xFirst = 70;
            int xSpacing = 70;

            float amHours = 0;
            float pmHours = 0;
            tPaint.setTextSize(21);
            for(int i = 1; i <= 6; i++){
                Pair<Float, Float> cur = drawWeeklySpacings(cs, tPaint, i, records, xFirst, xSpacing, topY, ySpacing);
                amHours += cur.first;
                pmHours += cur.second;
            }
            printRecord(cs, tPaint, new Pair<>(amHours, pmHours), xFirst, xSpacing, topY + 30, ySpacing, 7);

            tPaint.setTextSize(mainTextSize);
            String selectedMonthString = new DateFormatSymbols().getMonths()[selectedMonth];
            String monthYear = selectedMonthString + " " + selectedYear;
            cs.drawText( monthYear, 270, 467, tPaint);

            //////////////////////// Make Second File ////////////////////////
            src = Bitmap.createScaledBitmap(BitmapFactory.decodeResource(getResources(), R.drawable.daycare_attendance_sheet),
                    1243, 1608, false);
            Bitmap dest2 = Bitmap.createBitmap(src.getWidth(), src.getHeight(), Bitmap.Config.ARGB_8888);

            cs = new Canvas(dest2);
            tPaint = new Paint();
            tPaint.setTextSize(mainTextSize);
            tPaint.setColor(Color.BLUE);
            tPaint.setStyle(Paint.Style.FILL);
            cs.drawBitmap(src, 0f, 0f, null);

            int topRowY = 130;
            int midRowY = 174;
            int bottomRowY = 222;
            int firstColumnX = 154;
            int secondColumnX = 691;
            int thirdColumnX = 988;

            // No more case number
            //cs.drawText(currentChild.getCaseNumber(), 697, altIdY, tPaint);
            //First column
            cs.drawText(currentChild.getFamId(), firstColumnX, topRowY, tPaint);
            cs.drawText(currentChild.getParentName(), firstColumnX, midRowY, tPaint);
            cs.drawText(childFullName, firstColumnX, bottomRowY, tPaint);

            //Second column
            if (providerInfo.altId != null)
                cs.drawText(providerInfo.altId, secondColumnX, topRowY, tPaint);
            cs.drawText(providerInfo.name, secondColumnX, midRowY, tPaint);
            tPaint.setTextSize(22);
            String ageAndDOB = String.format("%s  %s",sdf.format(currentChild.getDob()),
                    ageWithYears);
            cs.drawText(ageAndDOB, secondColumnX, bottomRowY, tPaint);

            //Last column
            tPaint.setTextSize(mainTextSize);
            cs.drawText(providerInfo.key, thirdColumnX, topRowY, tPaint);
            cs.drawText(currentChild.getChildId(), thirdColumnX, bottomRowY, tPaint);

            cs.drawText(monthYear, 174, 270, tPaint);

            tPaint.setTextSize(lineTextSize);
            fillBlocks(cs, tPaint, records);

            // Create a PdfDocument with a page of the same size as the image
            PdfDocument document = new PdfDocument();
            PdfDocument.PageInfo pageInfo = new PdfDocument.PageInfo.Builder(dest.getHeight(), dest.getWidth(), 1).create();
            PdfDocument.Page page = document.startPage(pageInfo);

            // Draw the bitmap onto the page
            Canvas canvas = page.getCanvas();
            Matrix matrix = new Matrix();
            matrix.postRotate(90);
            Bitmap rotated = Bitmap.createBitmap(dest, 0, 0, dest.getWidth(), dest.getHeight(), matrix, true);
            canvas.drawBitmap(rotated, 0f, 0f, null);
            document.finishPage(page);

            PdfDocument.PageInfo pageInfo2 = new PdfDocument.PageInfo.Builder(dest2.getWidth(), dest2.getHeight(), 2).create();
            PdfDocument.Page page2 = document.startPage(pageInfo2);

            // Draw the bitmap onto the page
            Canvas canvas2 = page2.getCanvas();
            canvas2.drawBitmap(dest2, 0f, 0f, null);
            document.finishPage(page2);

            // Write the PDF file to a file
            String reportForChildBase = String.format("%s %s %s %s",
                    childFullName, selectedMonthString, selectedYear, currentChild.getChildId())
                    .replace(' ', '_');

            Utils.verifyStoragePermissions(activity);

            String folder_main = "Daycare_Reports";
            File f = getScopedAppDir(activity, folder_main);

            File pdfPath = new File(f.getAbsoluteFile() +  "/" + reportForChildBase + ".pdf");
            FileOutputStream fos;
            try {
                fos = new FileOutputStream(pdfPath);
                document.writeTo(fos);

                Uri pdfPathURI = FileProvider.getUriForFile(
                        CheckinCheckoutActivity.this,
                        "com.chuyinzki.jesusvillegas3.imperialdaycare.FileProvider",
                        pdfPath);

                Intent emailIntent = new Intent(Intent.ACTION_SEND_MULTIPLE);
                emailIntent.setType("text/plain");
                emailIntent.putExtra(Intent.EXTRA_SUBJECT,"Daycare Report");
                //This throws a weird log error. Don't worry about it. This is the only way to put text in the body.
                emailIntent.putExtra(Intent.EXTRA_TEXT, reportForChildBase);
                emailIntent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                ArrayList<Uri> uris = new ArrayList<>();
                uris.add(pdfPathURI);
                emailIntent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
                startActivity(Intent.createChooser(emailIntent, "Send mail..."));
            } catch (IOException e) {
                e.printStackTrace();
                FirebaseCrashlytics.getInstance().recordException(e);
                Toast.makeText(activity, "An error occurred while trying to print.", Toast.LENGTH_SHORT).show();
            }
            document.close();
        };
    }

    @Nullable
    private File getScopedAppDir(Context context, String location) {
        // Get the pictures directory that's inside the app-specific directory on
        // external storage.
        File file = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS), location);
        if (!file.exists() && !file.mkdirs()) {
            Log.e(TAG, "Directory not created");
            FirebaseCrashlytics.getInstance().log("Error creating file in app specific storage.");
            Toast.makeText(this, "An error occurred while creating the file.", Toast.LENGTH_SHORT).show();
        }
        return file;
    }

    private void allocateCacheSpace() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            //TODO: actually calculate the size of the document instead of magic values
            final long NUM_BYTES_NEEDED_FOR_MY_APP = 1024 * 1024 * 2; //2MB
            StorageManager storageManager = getApplicationContext().getSystemService(StorageManager.class);
            try {
                UUID appSpecificInternalDirUuid = storageManager.getUuidForPath(getFilesDir());
                long availableBytes =
                        storageManager.getAllocatableBytes(appSpecificInternalDirUuid);
                if (availableBytes >= NUM_BYTES_NEEDED_FOR_MY_APP) {
                    storageManager.allocateBytes(
                            appSpecificInternalDirUuid, NUM_BYTES_NEEDED_FOR_MY_APP);
                } else {
                    // To request that the user remove all app cache files instead, set
                    // "action" to ACTION_CLEAR_APP_CACHE.
                    Intent storageIntent = new Intent();
                    storageIntent.setAction(ACTION_MANAGE_STORAGE);
                }
            } catch (IOException e) {
                FirebaseCrashlytics.getInstance().recordException(e);
                Toast.makeText(this, "An error occurred while trying to allocate space.", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private static void fillBlocks(Canvas cs, Paint tPaint, List<DayRecord> records) {
        final int topY = 351;

        final int dayX = 98;
        final int timeInX = 214;
        final int schoolTimeOutX = 304;
        final int schoolTimeInX = 399;
        final int timeOutX = 488;
        final int amTotalX = 897;
        final int pmTotalX = 991;
        final int totalX = 1079;
        //This is the y diff from the top of the week (Sunday) to the total hours
        final int totalHoursyDiff = 166;

        final int weeklyYDiff = 188;
        final int individualLineDiff = 23;

        for(int i = 1; i <= 6; i++){
            List<DayRecord> weekRecords = getRecordsForWeekNumber(records, i);
            final int lineYBlockDiff = topY + (weeklyYDiff * (i - 1));
            for(DayRecord record: weekRecords) {
                Calendar checkIn = record.getDayAsCalendar();

                final int dayOfWeek = checkIn.get(Calendar.DAY_OF_WEEK); // SUNDAY = 1
                final int lineY = lineYBlockDiff + (individualLineDiff * (dayOfWeek - 1));

                printRecordItem(cs, tPaint, record.getFriendlyFormattedDateFullYear() , dayX, lineY);
                printRecordItem(cs, tPaint, Util.getTimeInHuman(record.getCheckIn()), timeInX ,lineY);
                printRecordItem(cs, tPaint, Util.getTimeInHuman(record.getSchoolCheckOut()), schoolTimeOutX ,lineY);
                printRecordItem(cs, tPaint, Util.getTimeInHuman(record.getSchoolCheckIn()), schoolTimeInX ,lineY);
                printRecordItem(cs, tPaint, Util.getTimeInHuman(record.getCheckOut()), timeOutX ,lineY);

                Pair<Float, Float> dayHours = getAmPmHours(record);
                if(dayOfWeek != SATURDAY && dayOfWeek != SUNDAY)
                    printRecordItem(cs, tPaint, dayHours.first, amTotalX ,lineY);
                printRecordItem(cs, tPaint, dayHours.second, pmTotalX ,lineY);
                printRecordItem(cs, tPaint, dayHours.first + dayHours.second, totalX ,lineY);
            }
            Pair<Float, Float> weekHours = Util.getAmPmHoursForWeek(records, i);
            int finalHoursY = lineYBlockDiff + totalHoursyDiff;
            printRecordItem(cs, tPaint, weekHours.first, amTotalX ,finalHoursY);
            printRecordItem(cs, tPaint, weekHours.second, pmTotalX ,finalHoursY);
            printRecordItem(cs, tPaint, weekHours.first + weekHours.second, totalX ,finalHoursY);
        }

        final int fullMonthTotalY = 1561;
        Pair<Float, Float> allHours = getAllAmPmHours(records);
        printRecordItem(cs, tPaint, allHours.first, amTotalX ,fullMonthTotalY);
        printRecordItem(cs, tPaint, allHours.second, pmTotalX ,fullMonthTotalY);
        printRecordItem(cs, tPaint, allHours.first + allHours.second, totalX ,fullMonthTotalY);
    }

    private static Pair<Float, Float> drawWeeklySpacings(Canvas cs, Paint tPaint, int week, List<DayRecord> records, int xFirst, int xSecond, int topY, int ySpacing) {
        Pair<Float, Float> weekHours = Util.getAmPmHoursForWeek(records, week);
        printRecord(cs, tPaint, weekHours, xFirst, xSecond, topY, ySpacing, week);
        return weekHours;
    }

    private static void printRecord(Canvas cs, Paint tPaint, Pair<Float, Float> weekHours, int xFirst, int xSpacing, int topY, int ySpacing, int iter) {
        cs.drawText(String.format(Locale.US, "%.1f", weekHours.first), xFirst, topY + (ySpacing * (iter - 1)), tPaint);
        cs.drawText(String.format(Locale.US, "%.1f", weekHours.second), xFirst + xSpacing,topY + (ySpacing * (iter - 1)), tPaint);
        cs.drawText(String.format(Locale.US, "%.1f", weekHours.first +  weekHours.second), xFirst + xSpacing * 2,topY + (ySpacing * (iter - 1)), tPaint);
    }

    private static void printRecordItem(Canvas cs, Paint tPaint, Object toPrint, int xCoordinate, int yCoordinate) {
        if(toPrint instanceof Float)
            cs.drawText(String.format(Locale.US, "%.1f", toPrint), xCoordinate, yCoordinate, tPaint);
        else
            cs.drawText(toPrint.toString(), xCoordinate, yCoordinate, tPaint);
    }

    @Override
    protected void onResume() {
        super.onResume();
        adapter.swapItems(ChildDatabase.getInstance(this).getAllChildDayRecords(currentChild));
    }

    @OnClick(R.id.checkin_button)
    public void checkin() {
        Long currentCheckin = ChildDatabase.getInstance(this).getChildCheckinOnDate(currentChild, Util.getMonthDayYear(null));
        Long currentCheckout = ChildDatabase.getInstance(this).getChildCheckoutOnDate(currentChild, Util.getMonthDayYear(null));
        if (currentCheckin == null) {
            if (currentCheckout != null && currentCheckout != 0)
                Toast.makeText(this, currentChild.getFirstName() + " already checked out today at " + Util.getTimeInHuman(currentCheckout), Toast.LENGTH_LONG).show();
            else {
                Long checkinTime = Util.getCurrentTimeMillis();
                boolean success = ChildDatabase.getInstance(this).putChildCheckinOnDate(currentChild, Util.getMonthDayYear(null), checkinTime) != -1;
                Toast.makeText(this, success ? currentChild.getFirstName() + " successfully " +
                        "checked in today at " + Util.getTimeInHuman(checkinTime) : "An error " +
                        "occurred...", Toast.LENGTH_LONG).show();
                finish();
            }
        } else
            Toast.makeText(this, currentChild.getFirstName() + " already checked in today at " + Util.getTimeInHuman(currentCheckin), Toast.LENGTH_LONG).show();
    }

    @OnClick(R.id.checkout_button)
    public void checkout() {
        Long currentCheckin = ChildDatabase.getInstance(this).getChildCheckinOnDate(currentChild, Util.getMonthDayYear(null));
        Long currentCheckout = ChildDatabase.getInstance(this).getChildCheckoutOnDate(currentChild, Util.getMonthDayYear(null));
        Long currentSchoolCheckout = ChildDatabase.getInstance(this).getChildSchoolCheckoutOnDate(currentChild, Util.getMonthDayYear(null));
        Long currentSchoolCheckin = ChildDatabase.getInstance(this).getChildSchoolCheckinOnDate(currentChild, Util.getMonthDayYear(null));
        if (currentCheckin == null)
            Toast.makeText(this, currentChild.getFirstName() + " has not checked in today yet.", Toast.LENGTH_LONG).show();
        else if (currentCheckout != null && currentCheckout != 0)
            Toast.makeText(this, currentChild.getFirstName() + " already checked out today at " + Util.getTimeInHuman(currentCheckout), Toast.LENGTH_LONG).show();
        else if(currentSchoolCheckout != null && currentSchoolCheckin == null)
            Toast.makeText(this, currentChild.getFirstName() + " hasn't checked back in from school.", Toast.LENGTH_LONG).show();
        else {
            Long checkoutTime = Util.getCurrentTimeMillis();
            ChildDatabase.getInstance(this).putChildCheckoutOnDate(currentChild, Util.getMonthDayYear(null), checkoutTime);
            Toast.makeText(this, currentChild.getFirstName() + " successfully checked out today at " + Util.getTimeInHuman(checkoutTime), Toast.LENGTH_LONG).show();
            finish();
        }
    }

    @OnClick(R.id.school_checkout_button)
    public void schoolCheckOut() {
        Long currentCheckin = ChildDatabase.getInstance(this).getChildCheckinOnDate(currentChild, Util.getMonthDayYear(null));
        Long currentCheckout = ChildDatabase.getInstance(this).getChildCheckoutOnDate(currentChild, Util.getMonthDayYear(null));
        Long currentSchoolCheckout = ChildDatabase.getInstance(this).getChildSchoolCheckoutOnDate(currentChild, Util.getMonthDayYear(null));
        Long currentSchoolCheckin = ChildDatabase.getInstance(this).getChildSchoolCheckinOnDate(currentChild, Util.getMonthDayYear(null));
        if (currentSchoolCheckout == null) {
            if (currentSchoolCheckin != null && currentSchoolCheckin != 0)
                Toast.makeText(this, currentChild.getFirstName() + " already checked in from school today at " + Util.getTimeInHuman(currentSchoolCheckin), Toast.LENGTH_LONG).show();
            else if(currentCheckin == null) {
                Toast.makeText(this, currentChild.getFirstName() + " has not yet checked in today.", Toast.LENGTH_LONG).show();
            } else if(currentCheckout != null) {
                Toast.makeText(this, currentChild.getFirstName() + " already checked out today.", Toast.LENGTH_LONG).show();
            }
            else {
                Long currentTime = Util.getCurrentTimeMillis();
                boolean success = ChildDatabase.getInstance(this).putChildSchoolCheckoutOnDate(currentChild, Util.getMonthDayYear(null), currentTime) != -1;
                Toast.makeText(this, success ? currentChild.getFirstName() + " successfully " +
                        "checked out to school today at " + Util.getTimeInHuman(currentTime) : "An error " +
                        "occurred...", Toast.LENGTH_LONG).show();
                finish();
            }
        } else
            Toast.makeText(this, currentChild.getFirstName() + " already checked out to school today at " + Util.getTimeInHuman(currentSchoolCheckout), Toast.LENGTH_LONG).show();
    }

    @OnClick(R.id.school_checkin_button)
    public void schoolCheckIn() {
        Long currentSchoolCheckout = ChildDatabase.getInstance(this).getChildSchoolCheckoutOnDate(currentChild, Util.getMonthDayYear(null));
        Long currentSchoolCheckin = ChildDatabase.getInstance(this).getChildSchoolCheckinOnDate(currentChild, Util.getMonthDayYear(null));
        if (currentSchoolCheckout == null)
            Toast.makeText(this, currentChild.getFirstName() + " has not checked out to school today yet.", Toast.LENGTH_LONG).show();
        else if (currentSchoolCheckin != null && currentSchoolCheckin != 0)
            Toast.makeText(this, currentChild.getFirstName() + " already checked in from school today at " + Util.getTimeInHuman(currentSchoolCheckin), Toast.LENGTH_LONG).show();
        else {
            Long curTime = Util.getCurrentTimeMillis();
            ChildDatabase.getInstance(this).putChildSchoolCheckinOnDate(currentChild, Util.getMonthDayYear(null), curTime);
            Toast.makeText(this, currentChild.getFirstName() + " successfully checked in from school today at " + Util.getTimeInHuman(curTime), Toast.LENGTH_LONG).show();
            finish();
        }
    }

    public class DayRecordAdapter extends ArrayAdapter<DayRecord> {

        public DayRecordAdapter(Context context, List<DayRecord> list) {
            //TODO: reusing the child lv item layout, but make another in future with update options
            super(context, R.layout.child_lv_item, list);
        }

        public void swapItems(List<DayRecord> list) {
            clear();
            Collections.sort(list);
            Collections.reverse(list);
            addAll(list);
            notifyDataSetChanged();
        }

        @Override
        public View getView(int position, View view, ViewGroup parent) {
            ViewHolder holder;
            if (view != null) {
                holder = (ViewHolder) view.getTag();
            } else {
                view = getLayoutInflater().inflate(R.layout.child_lv_item, null);
                holder = new ViewHolder(view);
                view.setTag(holder);
            }

            DayRecord record = getItem(position);
            String date = record.getFriendlyFormattedDate();
            holder.text.setText(String.format("%s In: %s Out: %s", date,
                    record.getCheckIn() == null ? "N/A" : Util.getTimeInHuman(Long.valueOf(record.getCheckIn())),
                    record.getCheckOut() == null ? "N/A" : Util.getTimeInHuman(Long.valueOf(record.getCheckOut()))));
            return view;
        }

        class ViewHolder {
            @BindView(R.id.item_text)
            TextView text;

            ViewHolder(View view) {
                ButterKnife.bind(this, view);
                text.setTextSize(COMPLEX_UNIT_SP, 20);
            }
        }
    }
}
