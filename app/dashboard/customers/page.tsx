import { fetchFilteredCustomers } from "@/app/lib/data"
import CustomersTable from "@/app/ui/customers/table"

async function page(props: {
    searchParams: Promise<{
        query: string
    }>
}) {
    const searchParams = await props.searchParams;
    const query = searchParams.query || '';
    const allCustomers = await fetchFilteredCustomers(query);


    return (
        <div>
            <CustomersTable customers={allCustomers} />
        </div>
    )
}

export default page