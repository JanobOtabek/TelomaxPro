// 2. Insert sale record
      const salePayload: any = {
        id: saleId,
        pname: selectedProduct.name,
        pcat: selectedProduct.cat,
        qty: quantity,
        price: customPrice,
        cost: selectedProduct.cost || 0,
        orig_price: selectedProduct.price,
        customer: customerName,
        phone: customerPhone,
        date: dateIso,
        sale_type: saleType,
        store_id: storeId
      };

      let { error: saleErr } = await supabase.from('sales').insert(salePayload);

      // Agar 'orig_price' ustuni ma'lumotlar bazasida yo'qligi sababli xato bersa, uni olib tashlab qaytadan urinib ko'ramiz
      if (saleErr && (
        saleErr.message?.includes('orig_price') || 
        saleErr.details?.includes('orig_price') || 
        saleErr.message?.includes('schema cache')
      )) {
        const { orig_price, ...fallbackPayload } = salePayload;
        const fallbackRes = await supabase.from('sales').insert(fallbackPayload);
        saleErr = fallbackRes.error;
      }

      if (saleErr) throw saleErr;
