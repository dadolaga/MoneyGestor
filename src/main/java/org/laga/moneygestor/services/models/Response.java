package org.laga.moneygestor.services.models;

public class Response {
    private static final Integer OK_CODE = 1;
    public static Response create(Object content) {
        return create(content, OK_CODE);
    }

    public static Response create(Object content, Integer code) {
        return new Response(code, content.getClass().getSimpleName(), content);
    }

    public static Response error(String message, Integer code) {
        return new Response(code, "ERROR", message);
    }

    public static Response ok() {
        return new Response(OK_CODE, null, null);
    }

    public static<ID> Response sendId(ID id) {
        var sendId = new SendId<ID>();

        sendId.setId(id);

        return Response.create(sendId);
    }

    private final Integer code;
    private final String type;
    private final Object content;

    private Response(Integer code, String type, Object content) {
        this.code = code;
        this.type = type;
        this.content = content;
    }

    public Integer getCode() {
        return code;
    }

    public String getType() {
        return type;
    }

    public Object getContent() {
        return content;
    }
}
