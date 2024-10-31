const {getDateRange ,generateSaleReport} = require('../../helpers/utility')

const { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/*********************************     SALES REPORT PAGE     ************************************** */
const salesReportPage = async (req, res) => {
    try {
        startDate = startOfToday();  
        endDate = endOfToday();

        // const { startDate, endDate } = getDateRange('today');

        const result  = await generateSaleReport(startDate, endDate);

        res.render('salesReport',{orders : result.orders ,salesSummary : result.salesSummary })
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
};
/*********************************     GENERATE SALES REPORT     ************************************** */
const generateSalesReport = async (req, res) => {
    try {

        // const dateRange = getDateRange(req.query);

        // if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
        //     console.log('Invalid date range or filter')
        //     return res.status(401)
        // }

        // const startDate = dateRange.startDate;
        // const endDate = dateRange.endDate;


        const { startDate, endDate } = getDateRange(req.query);  // destructuring way

        if (!startDate || !endDate) {
            console.log('Invalid date range or filter')
            return res.status(401)
        }

        const result  = await generateSaleReport(startDate, endDate);
        
        res.status(201).json({
            orders : result.orders,
            salesSummary : result.salesSummary,
        });

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
};
/*********************************     SALES REPORT PDF DOWNLOAD     ******************************** */
const salesReportDownload = async(req,res)=>{
    try {  
        const { startDate, endDate } =  getDateRange(req.query);

        if (!startDate || !endDate) {
            console.log("Invalid date range or filter")
            return res.status(400)
        }

        // const result = await generateSaleReport(startDate, endDate);                     // normalway
        // const orders = result.orders;
        // const salesSummary = result.salesSummary;
        // const { orders, salesSummary } = result;                                        //Destructured

        const { orders, salesSummary }  = await generateSaleReport(startDate, endDate);   // bettter way Destructured
        console.log(orders,salesSummary)

        if(req.query.format == 'pdf'){
            // Create a PDF document                                              //PDFDocument = require('pdfkit')
            const doc = new PDFDocument();    
            let filename = `Sales_Report_${new Date().toISOString()}.pdf`;

            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/pdf');

            // Add content to the PDF
            doc.fontSize(18).text('Sales Report', { align: 'center',underline: true }); //you can make it decorative 
            doc.moveDown();
            doc.fontSize(12).text(`Date Range: ${startDate.toDateString()} - ${endDate.toDateString()}`);
            doc.moveDown();

            // Sales Summary
            doc.fontSize(14).text('Sales Summary', { underline: true });
            doc.text(`Total Sales: ₹${salesSummary.totalSales}`);
            doc.text(`Total Orders: ${salesSummary.totalOrders}`);
            doc.text(`Total Delivered: ${salesSummary.totalDelivered}`);
            doc.text(`Total Canceled: ${salesSummary.totalCanceled}`);
            doc.moveDown();

            // Orders Table
            doc.fontSize(14).text('Orders', { underline: true });
            orders.forEach(order => {
                doc.text(`Order ID: ${order._id}`);
                doc.text(`Actual Amount: ₹${order.totalRegularPrice}`);
                doc.text(`Discount Offer: ₹${order.discount}`);
                doc.text(`Coupon Discount: ₹${order.coupon && order.coupon.id ? order.coupon.discount : 0}`);
                doc.text(`Total Discount: ₹${order.discount + (order.coupon && order.coupon.id ? order.coupon.discount : 0)}`);
                doc.text(`Order Amount: ${order.totalSalePrice === 0 ? 'Failed' : `₹${order.totalSalePrice}`}`);
                doc.text(`Order Date: ${new Date(order.orderDate).toLocaleDateString('en-GB')}`);
                doc.moveDown();
            });
                doc.end();
                doc.pipe(res);   //pipe() - it connects the output of one stream to be the input of another.( Here, PDF document stream -to-> response (res) stream )
        }
        
        if(req.query.format == 'excel'){
            // Create a Excel doucment
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Report');

            // Add column headers
            worksheet.columns = [
                { header: 'Order ID', key: '_id', width: 25 },
                { header: 'Actual Amount', key: 'totalRegularPrice', width: 20 },
                { header: 'Discount Offer', key: 'discount', width: 20 },
                { header: 'Coupon Discount', key: 'couponDiscount', width: 20 },
                { header: 'Total Discount', key: 'totalDiscount', width: 20 },
                { header: 'Order Amount', key: 'totalSalePrice', width: 20 },
                { header: 'Order Date', key: 'orderDate', width: 20 },
            ];

            // Add data rows
            orders.forEach(order => {
                worksheet.addRow({
                    _id: order._id,
                    totalRegularPrice: `₹${order.totalRegularPrice.toLocaleString('en-IN')}`,
                    discount: `₹${order.discount.toLocaleString('en-IN')}`,
                    couponDiscount: order.coupon && order.coupon.id ? `₹${order.coupon.discount.toLocaleString('en-IN')}` : 'N/A',
                    totalDiscount: `₹${(order.discount + (order.coupon && order.coupon.id ? order.coupon.discount : 0)).toLocaleString('en-IN')}`,
                    totalSalePrice: order.totalSalePrice === 0 ? 'Failed' : `₹${order.totalSalePrice.toLocaleString('en-IN')}`,
                    orderDate: new Date(order.orderDate).toLocaleDateString('en-GB'),
                });
            });

            // Add summary at the end
            worksheet.addRow([]);
            worksheet.addRow(['Summary']);
            worksheet.addRow(['Total Sales', `₹${salesSummary.totalSales.toLocaleString('en-IN')}`]);
            worksheet.addRow(['Total Orders', salesSummary.totalOrders]);
            worksheet.addRow(['Total Delivered', salesSummary.totalDelivered]);
            worksheet.addRow(['Total Canceled', salesSummary.totalCanceled]);

            // Set response headers for file download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Sales_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);

            // Write the workbook to the response stream
            await workbook.xlsx.write(res);
            res.end();
        }        
    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}

module.exports={
    salesReportPage,
        generateSalesReport,
        salesReportDownload,
}