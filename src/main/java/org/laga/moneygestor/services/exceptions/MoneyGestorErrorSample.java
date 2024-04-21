package org.laga.moneygestor.services.exceptions;

import com.google.gson.*;
import com.google.gson.stream.JsonReader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;

import java.io.FileReader;
import java.io.InputStreamReader;
import java.util.LinkedHashMap;
import java.util.Map;

public class MoneyGestorErrorSample {

    private static Logger logger = LoggerFactory.getLogger(MoneyGestorErrorSample.class);

    public static final Map<Integer, HttpException> mapOfError;

    static {
        mapOfError = new LinkedHashMap<>();

        try {
            InputStreamReader inputStreamReader = new InputStreamReader(MoneyGestorErrorSample.class.getClassLoader().getResourceAsStream("error.json"));
            JsonElement json = JsonParser.parseReader(inputStreamReader);

            for (var element : json.getAsJsonObject().getAsJsonArray("errors")) {
                JsonObject jsonObject = element.getAsJsonObject();

                mapOfError.put(jsonObject.getAsJsonPrimitive("code").getAsInt(),
                        new HttpException(HttpStatusCode.valueOf(jsonObject.getAsJsonPrimitive("httpStatusCode").getAsInt()),
                                new Error(jsonObject.getAsJsonPrimitive("code").getAsInt(), jsonObject.getAsJsonPrimitive("message").getAsString())));

            }
        } catch (Exception ex) {
            logger.error("Impossible initialize error sample", ex);
            System.exit(-1);
        }
    }
}
