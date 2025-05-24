import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingCustomFields1748062284379 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsSize" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsColorpalette" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsArrangementstyle" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsAddon" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsMilktype" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsFlavorshot" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsCaffeinelevel" character varying(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsCaffeinelevel"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsFlavorshot"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsMilktype"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsAddon"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsArrangementstyle"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsColorpalette"`);
    await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsSize"`);
  }
}
