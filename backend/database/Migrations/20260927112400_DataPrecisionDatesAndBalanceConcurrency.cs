using Microsoft.EntityFrameworkCore.Migrations;
using System;

#nullable disable

namespace database.Migrations {
    /// <inheritdoc />
    public partial class DataPrecisionDatesAndBalanceConcurrency : Migration {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder) {
            migrationBuilder.CreateIndex(
                name: "IX_transaction_UserId_Date",
                table: "transaction",
                columns: new[] { "UserId", "Date" });

            migrationBuilder.DropIndex(
                name: "IX_transaction_UserId",
                table: "transaction");

            migrationBuilder.AlterColumn<Decimal>(
                name: "Value",
                table: "wallet",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                oldClrType: typeof(Double),
                oldType: "double");

            migrationBuilder.AlterColumn<Decimal>(
                name: "CurrentValue",
                table: "wallet",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                oldClrType: typeof(Double),
                oldType: "double");

            migrationBuilder.AddColumn<UInt64>(
                name: "BalanceVersion",
                table: "wallet",
                type: "bigint unsigned",
                nullable: false,
                defaultValue: 0ul);

            migrationBuilder.AlterColumn<Decimal>(
                name: "Value",
                table: "transaction",
                type: "decimal(19,2)",
                precision: 19,
                scale: 2,
                nullable: false,
                oldClrType: typeof(Double),
                oldType: "double");

            migrationBuilder.AlterColumn<String>(
                name: "LongDescription",
                table: "transaction",
                type: "varchar(4000)",
                maxLength: 4000,
                nullable: true,
                oldClrType: typeof(String),
                oldType: "longtext",
                oldNullable: true);

            migrationBuilder.AlterColumn<String>(
                name: "Description",
                table: "transaction",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(String),
                oldType: "longtext",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "Date",
                table: "transaction",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "datetime(6)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_transaction_Value_NonZero",
                table: "transaction",
                sql: "`Value` <> 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder) {
            migrationBuilder.CreateIndex(
                name: "IX_transaction_UserId",
                table: "transaction",
                column: "UserId");

            migrationBuilder.DropIndex(
                name: "IX_transaction_UserId_Date",
                table: "transaction");

            migrationBuilder.DropCheckConstraint(
                name: "CK_transaction_Value_NonZero",
                table: "transaction");

            migrationBuilder.DropColumn(
                name: "BalanceVersion",
                table: "wallet");

            migrationBuilder.AlterColumn<Double>(
                name: "Value",
                table: "wallet",
                type: "double",
                nullable: false,
                oldClrType: typeof(Decimal),
                oldType: "decimal(19,2)",
                oldPrecision: 19,
                oldScale: 2);

            migrationBuilder.AlterColumn<Double>(
                name: "CurrentValue",
                table: "wallet",
                type: "double",
                nullable: false,
                oldClrType: typeof(Decimal),
                oldType: "decimal(19,2)",
                oldPrecision: 19,
                oldScale: 2);

            migrationBuilder.AlterColumn<Double>(
                name: "Value",
                table: "transaction",
                type: "double",
                nullable: false,
                oldClrType: typeof(Decimal),
                oldType: "decimal(19,2)",
                oldPrecision: 19,
                oldScale: 2);

            migrationBuilder.AlterColumn<String>(
                name: "LongDescription",
                table: "transaction",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(String),
                oldType: "varchar(4000)",
                oldMaxLength: 4000,
                oldNullable: true);

            migrationBuilder.AlterColumn<String>(
                name: "Description",
                table: "transaction",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(String),
                oldType: "varchar(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "Date",
                table: "transaction",
                type: "datetime(6)",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date");

        }
    }
}