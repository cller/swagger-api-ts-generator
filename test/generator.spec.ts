import assert = require("assert");
import { Generator } from "../src/generator";



describe('Generator', function () {
  let generator: Generator;

  beforeEach(() => {
    generator = new Generator();
  });

  describe('#generateTypeName()', function () {
    it('应该转换“HttpResponse«Page«TransferRecordRes»»”为“ApiHttpResponse<ApiPage<ApiTransferRecordRes>>”', function () {
      assert.equal(generator.generateTypeName('HttpResponse«Page«TransferRecordRes»»'), 'ApiHttpResponse<ApiPage<ApiTransferRecordRes>>');
    });

    it('应该转换“Page«Map«string,object»»”为“ApiPage<Map<string,object>>”', function () {
      assert.equal(generator.generateTypeName('Page«Map«string,object»»'), 'ApiPage<Map<string,object>>');
    });

    it('应该转换“Page«Array«object»»”为“ApiPage<Array<object>>”', function () {
      assert.equal(generator.generateTypeName('Page«Array«object»»'), 'ApiPage<Array<object>>');
    });
  });
});
